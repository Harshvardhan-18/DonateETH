import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requireAdminAuth } from "./middleware/auth.js";
import { adminConfig } from "./config.js";
import { etherscanTxUrl, fetchRecentDonationEvents } from "./services/blockchain.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "ACTIVE"]),
});

const updateProofSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

const verifyDocumentSchema = z.object({
  campaignId: z.string().min(1),
  docType: z.enum(["CERTIFICATE", "SUPPORTING_DOC", "CAMPAIGN_IMAGE"]),
  documentUrl: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export function buildAdminRouter(prisma) {
  const router = express.Router();
  const asyncHandler =
    (fn) =>
    async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  const ensureDocumentVerificationTable = async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_document_verifications (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        document_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        reviewed_at TIMESTAMP NULL,
        reviewed_by TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (campaign_id, doc_type, document_url)
      );
    `);
  };

  router.use(helmet());
  router.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  router.post("/auth/login", asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid login payload" });
    }

    const { email, password } = parsed.data;
    const normalized = email.toLowerCase();
    const envAdminEmail = adminConfig.adminEmail.toLowerCase();

    let isValid = false;
    if (normalized === envAdminEmail) {
      isValid = await bcrypt.compare(password, await bcrypt.hash(adminConfig.adminPassword, 10));
    }

    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ email: normalized, role: "ADMIN" }, adminConfig.jwtSecret, {
      expiresIn: adminConfig.jwtExpiresIn,
    });

    return res.json({ token, role: "ADMIN" });
  }));

  router.use(requireAdminAuth);

  router.get("/dashboard/overview", asyncHandler(async (_req, res) => {
    const transactions = await prisma.donationTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const ngos = await prisma.nGOProfile.count();
    const campaigns = await prisma.campaign.count();

    const totalEth = transactions.reduce((acc, tx) => acc + Number(tx.amountEth || 0), 0);
    const totalInr = totalEth * adminConfig.ethToInr;

    return res.json({
      metrics: {
        totalDonationsEth: totalEth,
        totalDonationsInr: totalInr,
        totalNgos: ngos,
        totalCampaignsActive: campaigns,
      },
      recentTransactions: transactions.map((tx) => ({ ...tx, etherscanUrl: etherscanTxUrl(tx.txHash) })),
    });
  }));

  router.get("/ngos", asyncHandler(async (_req, res) => {
    const ngos = await prisma.nGOProfile.findMany({
      include: { campaigns: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(ngos);
  }));

  router.patch("/ngos/:id/status", asyncHandler(async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid status value" });

    const ngo = await prisma.nGOProfile.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });
    return res.json(ngo);
  }));

  router.get("/transactions", asyncHandler(async (_req, res) => {
    const txs = await prisma.donationTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return res.json(txs.map((tx) => ({ ...tx, etherscanUrl: etherscanTxUrl(tx.txHash) })));
  }));

  router.post("/transactions/sync", asyncHandler(async (_req, res) => {
    const chainTxs = await fetchRecentDonationEvents();
    let inserted = 0;

    for (const tx of chainTxs) {
      // Prevent duplicate transactions using txHash unique key.
      const exists = await prisma.donationTransaction.findUnique({ where: { txHash: tx.txHash } });
      if (exists) continue;
      await prisma.donationTransaction.create({
        data: {
          donorWallet: tx.donorWallet || "",
          ngoWallet: tx.ngoWallet || "",
          amountEth: tx.amountEth,
          txHash: tx.txHash,
          campaignId: tx.campaignId,
        },
      });
      inserted += 1;
    }

    return res.json({ synced: inserted, chainEvents: chainTxs.length });
  }));

  router.get("/documents", asyncHandler(async (req, res) => {
    await ensureDocumentVerificationTable();

    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        title: true,
        certificateUrl: true,
        supportingDocUrl: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const verifications = await prisma.$queryRawUnsafe(`
      SELECT campaign_id, doc_type, document_url, status, reviewed_at
      FROM admin_document_verifications;
    `);

    const verificationMap = new Map(
      verifications.map((row) => [
        `${row.campaign_id}::${row.doc_type}::${row.document_url}`,
        row,
      ])
    );

    const toPreviewUrl = (value) => {
      if (!value) return "";
      if (/^https?:\/\//i.test(value)) return value;
      if (value.startsWith("/uploads/")) {
        return `${req.protocol}://${req.get("host")}${value}`;
      }
      return `${adminConfig.pinataGatewayBase}${value}`;
    };

    const documents = [];
    for (const campaign of campaigns) {
      const candidateDocs = [
        { docType: "CERTIFICATE", documentUrl: campaign.certificateUrl },
        { docType: "SUPPORTING_DOC", documentUrl: campaign.supportingDocUrl },
        { docType: "CAMPAIGN_IMAGE", documentUrl: campaign.imageUrl },
      ].filter((doc) => !!doc.documentUrl);

      for (const doc of candidateDocs) {
        const key = `${campaign.id}::${doc.docType}::${doc.documentUrl}`;
        const existing = verificationMap.get(key);
        documents.push({
          id: key,
          campaignId: campaign.id,
          campaign: { id: campaign.id, title: campaign.title },
          type: doc.docType,
          sourceUrl: doc.documentUrl,
          previewUrl: toPreviewUrl(doc.documentUrl),
          status: existing?.status || "PENDING",
          verifiedAt: existing?.reviewed_at || null,
        });
      }
    }

    return res.json(documents);
  }));

  router.patch("/documents/:id/status", asyncHandler(async (req, res) => {
    const parsed = updateProofSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid document status" });
    return res.status(400).json({
      message: "Legacy route not supported. Use /admin/documents/verify",
    });
  }));

  router.patch("/documents/verify", asyncHandler(async (req, res) => {
    await ensureDocumentVerificationTable();
    const parsed = verifyDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid document verification payload" });
    }

    const { campaignId, docType, documentUrl, status } = parsed.data;
    const rowId = `${campaignId}::${docType}::${documentUrl}`;
    const reviewedBy = req.admin?.email || "admin";

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO admin_document_verifications (id, campaign_id, doc_type, document_url, status, reviewed_at, reviewed_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (campaign_id, doc_type, document_url)
      DO UPDATE SET status = EXCLUDED.status, reviewed_at = NOW(), reviewed_by = EXCLUDED.reviewed_by;
      `,
      rowId,
      campaignId,
      docType,
      documentUrl,
      status,
      reviewedBy
    );

    return res.json({
      id: rowId,
      campaignId,
      docType,
      documentUrl,
      status,
      reviewedBy,
      verifiedAt: new Date().toISOString(),
    });
  }));

  // User management intentionally omitted: donors can donate anonymously.

  router.get("/analytics", asyncHandler(async (_req, res) => {
    const txs = await prisma.donationTransaction.findMany({ orderBy: { createdAt: "asc" } });
    const byDay = {};
    txs.forEach((tx) => {
      const key = new Date(tx.createdAt).toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + Number(tx.amountEth || 0);
    });
    const donationTrend = Object.entries(byDay).map(([date, amount]) => ({ date, amount }));

    const topNgos = await prisma.donationTransaction.groupBy({
      by: ["ngoWallet"],
      _sum: { amountEth: true },
      orderBy: { _sum: { amountEth: "desc" } },
      take: 5,
    });

    const activeDonors = await prisma.donationTransaction.groupBy({
      by: ["donorWallet"],
      _count: { donorWallet: true },
      orderBy: { _count: { donorWallet: "desc" } },
      take: 5,
    });

    return res.json({ donationTrend, topNgos, activeDonors });
  }));

  router.use((error, _req, res, _next) => {
    console.error("Admin route error:", error);
    return res.status(500).json({
      message: "Admin API error",
      code: error?.code || "UNKNOWN",
      detail: error?.message || "Unexpected server error",
    });
  });

  return router;
}
