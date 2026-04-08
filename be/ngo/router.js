import express from "express";
import { z } from "zod";

function normalizeWallet(value) {
  return String(value || "").trim().toLowerCase();
}

const createNgoSchema = z.object({
  name: z.string().min(2),
  registrationNumber: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).optional().or(z.literal("")),
  walletAddress: z.string().min(10).optional().or(z.literal("")),
});

export function buildNgoRouter(prisma) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const ngos = await prisma.nGOProfile.findMany({
        include: { campaigns: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(ngos);
    } catch (e) {
      next(e);
    }
  });

  // Must be defined before `/:id` so `/me` doesn't get captured as an id.
  router.get("/me", async (req, res, next) => {
    try {
      const walletAddress = normalizeWallet(req.query.walletAddress);
      if (!walletAddress) {
        return res.status(400).json({ message: "walletAddress is required" });
      }

      // Be tolerant of older rows that may store wallet casing/spacing inconsistently.
      const candidates = await prisma.nGOProfile.findMany({
        where: {
          walletAddress: { not: null },
        },
        include: { campaigns: true },
      });
      const ngo = candidates.find((item) => normalizeWallet(item.walletAddress) === walletAddress) || null;
      const allowed = Boolean(ngo && ["APPROVED", "ACTIVE"].includes(String(ngo.status)));

      return res.json({
        allowed,
        registered: Boolean(ngo),
        ngo,
      });
    } catch (e) {
      next(e);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const ngo = await prisma.nGOProfile.findUnique({
        where: { id: req.params.id },
        include: { campaigns: true },
      });
      if (!ngo) return res.status(404).json({ message: "NGO not found" });
      res.json(ngo);
    } catch (e) {
      next(e);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const parsed = createNgoSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid NGO payload" });

      const walletAddress = parsed.data.walletAddress ? String(parsed.data.walletAddress).toLowerCase() : null;
      const ngo = await prisma.nGOProfile.create({
        data: {
          name: parsed.data.name,
          registrationNumber: parsed.data.registrationNumber,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          walletAddress,
          status: "PENDING",
        },
      });

      res.status(201).json(ngo);
    } catch (e) {
      next(e);
    }
  });

  router.use((error, _req, res, _next) => {
    console.error("NGO route error:", error);
    res.status(500).json({ message: "NGO API error", detail: error?.message || "Unexpected server error" });
  });

  return router;
}

