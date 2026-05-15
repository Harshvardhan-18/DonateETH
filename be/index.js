import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import genaiRoute from './genai.js';
import { buildAdminRouter } from "./admin/router.js";
import { buildNgoRouter } from "./ngo/router.js";
import { fetchRecentWithdrawalEvents } from "./admin/services/blockchain.js";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/genai', genaiRoute)
app.use("/admin", buildAdminRouter(prisma));
app.use("/ngos", buildNgoRouter(prisma));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

let donorTableEnsured = false;
async function ensureDonationDonorTable() {
  if (donorTableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS donor_profiles (
      wallet_address TEXT PRIMARY KEY,
      donor_name TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  donorTableEnsured = true;
}

let campaignDonationsTableEnsured = false;
async function ensureCampaignDonationsTable() {
  if (campaignDonationsTableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS campaign_donations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      donor_wallet TEXT NOT NULL,
      donor_name TEXT NULL,
      ngo_wallet TEXT NULL,
      amount_eth TEXT NOT NULL,
      tx_hash TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  campaignDonationsTableEnsured = true;
}

const pinataGatewayBase = (process.env.PINATA_GATEWAY_BASE || "https://gateway.pinata.cloud/ipfs/").replace(/\/+$/, "/");

function getPinataAuthHeaders() {
  const pinataJwt = String(process.env.PINATA_JWT || "").trim();
  const pinataApiKey = String(process.env.PINATA_API_KEY || "").trim();
  const pinataApiSecret = String(process.env.PINATA_API_SECRET || "").trim();

  if (pinataJwt) {
    const segments = pinataJwt.split(".");
    if (segments.length === 3) {
      return { Authorization: `Bearer ${pinataJwt}` };
    }
  }

  if (pinataApiKey && pinataApiSecret) {
    return {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataApiSecret,
    };
  }

  throw new Error(
    "Pinata credentials are missing or invalid. Provide PINATA_JWT (three JWT segments) or PINATA_API_KEY and PINATA_API_SECRET."
  );
}

async function uploadFileToPinata(file, folderName) {
  if (!file) return null;

  const formData = new FormData();
  const fileBlob = new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" });
  formData.append("file", fileBlob, file.originalname || "upload.bin");
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: file.originalname || folderName,
      keyvalues: { folder: folderName },
    })
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: getPinataAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return `${pinataGatewayBase}${data.IpfsHash}`;
}

// Configure multer upload in memory so files can be pinned to IPFS
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Define the route for creating a campaign with multiple file uploads
app.post("/create-campaign", upload.fields([
  { name: 'imageUrl', maxCount: 1 },
  { name: 'certificateFile', maxCount: 1 },
  { name: 'supportingDocFile', maxCount: 1 }
]), async (req, res) => {
  try {
    // Get form data
    const { 
      title, 
      description, 
      goal, 
      daysLeft,
      ngoRegistrationNumber,
      contactName,
      contactEmail,
      contactPhone,
      walletaddress,
      imageUrlLink, // URL alternative if no file upload
      milestones 
    } = req.body;

    if (!ngoRegistrationNumber) {
      return res.status(400).json({ success: false, message: "ngoRegistrationNumber is required" });
    }

    if (!walletaddress) {
      return res.status(400).json({ success: false, message: "walletaddress is required" });
    }

    const walletAddrNormalized = String(walletaddress).toLowerCase();

    // Only a registered/approved NGO can create a campaign.
    const ngoProfile = await prisma.nGOProfile.findFirst({
      where: {
        registrationNumber: String(ngoRegistrationNumber),
        status: { in: ["APPROVED", "ACTIVE"] },
      },
    });

    if (!ngoProfile) {
      return res.status(403).json({
        success: false,
        message: "NGO not approved/active. Register and get approval before creating campaigns.",
      });
    }

    if (!ngoProfile.walletAddress) {
      return res.status(403).json({
        success: false,
        message: "NGO wallet is not set. Please register your NGO with a wallet address.",
      });
    }

    if (String(ngoProfile.walletAddress).toLowerCase() !== walletAddrNormalized) {
      return res.status(403).json({
        success: false,
        message: "walletaddress does not match the registered NGO wallet.",
      });
    }
    
    // Handle file uploads via Pinata/IPFS
    let imageUrl = null;
    let certificateUrl = null;
    let supportingDocUrl = null;
    
    if (req.files?.imageUrl?.[0]) {
      imageUrl = await uploadFileToPinata(req.files.imageUrl[0], "campaign-image");
    } else if (imageUrlLink) {
      imageUrl = imageUrlLink;
    }

    if (req.files?.certificateFile?.[0]) {
      certificateUrl = await uploadFileToPinata(req.files.certificateFile[0], "campaign-certificate");
    }

    if (req.files?.supportingDocFile?.[0]) {
      supportingDocUrl = await uploadFileToPinata(req.files.supportingDocFile[0], "campaign-supporting-doc");
    }
    
    // Create campaign in database
    const campaign = await prisma.campaign.create({
      data: {
        ngoId: ngoProfile.id,
        title,
        walletaddress: walletAddrNormalized,
        description,
        imageUrl,
        raised: "0",
        goal,
        daysLeft: parseInt(daysLeft) || 30,
        ngoRegistrationNumber,
        contactName,
        contactEmail,
        contactPhone,
        certificateUrl,
        supportingDocUrl
      },
    });
    
    // Parse and create milestones if provided
    let parsedMilestones;
    try {
      parsedMilestones = JSON.parse(milestones);
    } catch (error) {
      parsedMilestones = [];
      console.error("Error parsing milestones:", error);
    }
    
    if (parsedMilestones && parsedMilestones.length > 0) {
      await prisma.milestone.createMany({
        data: parsedMilestones.map((milestone) => ({
          title: milestone.title,
          amount: milestone.amount,
          status: milestone.status || "pending", // Default status if missing
          campaignId: campaign.id,
        })),
      });
    }
    
    res.json({ 
      success: true, 
      message: "Campaign created successfully with ID: " + campaign.id,
      campaignId: campaign.id
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get('/campaigns', async (req, res) => {
  const result = await prisma.campaign.findMany({
    where: {
      ngo: {
        status: { in: ["APPROVED", "ACTIVE"] },
      },
    },
    include: { ngo: true },
  });
  res.json(result);
});

app.get('/milestones', async (req, res) => {
  const result = await prisma.milestone.findMany();
  res.json(result);
});

app.get('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const result = await prisma.campaign.findFirst({
    where: {
      id,
      ngo: {
        status: { in: ["APPROVED", "ACTIVE"] },
      },
    },
    include: { ngo: true },
  });
  if (!result) {
    return res.status(404).json({ message: "Campaign not found" });
  }
  res.json(result);
});

app.get('/campaigns/:id/donations', async (req, res) => {
  const { id } = req.params;
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      ngo: {
        status: { in: ["APPROVED", "ACTIVE"] },
      },
    },
  });
  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  // Handle multiple historical shapes:
  // - campaignId stored as campaign UUID
  // - campaignId stored as campaign title from chain event payload
  const donations = await prisma.donationTransaction.findMany({
    where: {
      OR: [{ campaignId: id }, { campaignId: campaign.title || "" }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      donorWallet: true,
      ngoWallet: true,
      amountEth: true,
      txHash: true,
      createdAt: true,
      campaignId: true,
    },
  });

  await ensureCampaignDonationsTable();
  const offchainDonations = await prisma.$queryRawUnsafe(
    `
    SELECT
      id,
      campaign_id AS "campaignId",
      donor_wallet AS "donorWallet",
      donor_name AS "donorName",
      ngo_wallet AS "ngoWallet",
      amount_eth AS "amountEth",
      tx_hash AS "txHash",
      created_at AS "createdAt"
    FROM campaign_donations
    WHERE campaign_id = $1
    ORDER BY created_at DESC;
    `,
    id
  );

  await ensureDonationDonorTable();
  const donorProfiles = await prisma.$queryRawUnsafe(`
    SELECT wallet_address, donor_name
    FROM donor_profiles;
  `);
  const donorNameByWallet = new Map(
    donorProfiles.map((row) => [String(row.wallet_address || "").toLowerCase(), row.donor_name])
  );

  const merged = [...offchainDonations, ...donations]
    .map((tx) => ({
      ...tx,
      donorName:
        tx.donorName ||
        donorNameByWallet.get(String(tx.donorWallet || "").toLowerCase()) ||
        null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const seen = new Set();
  const deduped = merged.filter((tx) => {
    const dedupeKey =
      String(tx.txHash || "").trim().toLowerCase() ||
      [
        String(tx.campaignId || id),
        String(tx.donorWallet || "").toLowerCase(),
        String(tx.amountEth || ""),
        new Date(tx.createdAt || 0).toISOString(),
      ].join("|");
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });

  res.json(deduped);
});

app.get('/campaigns/:id/ngo-transactions', async (req, res) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      ngo: {
        status: { in: ["APPROVED", "ACTIVE"] },
      },
    },
    include: { ngo: true },
  });

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  const ngoWallet = String(campaign.walletaddress || campaign.ngo?.walletAddress || "").trim().toLowerCase();
  if (!ngoWallet) {
    return res.json([]);
  }

  const chainWithdrawals = await fetchRecentWithdrawalEvents();
  const transactions = chainWithdrawals
    .filter((tx) => String(tx.ngoWallet || "").trim().toLowerCase() === ngoWallet)
    .sort((a, b) => Number(b.blockNumber || 0) - Number(a.blockNumber || 0))
    .slice(0, 3)
    .map((tx) => ({
      id: tx.txHash,
      ngoWallet: tx.ngoWallet,
      amountEth: tx.amountEth,
      txHash: tx.txHash,
      blockNumber: tx.blockNumber,
      direction: "sent",
    }));

  res.json(transactions);
});

app.post('/campaigns/:id/updateRaised', async (req, res) => {
  const { id } = req.params;
  const { amount, donorWallet, donorName, txHash } = req.body;


  const campaign = await prisma.campaign.findUnique({
    where: {
      id,
    },
  });
  const finalAns = parseFloat(campaign.raised) + parseFloat(amount)
  const cam = await prisma.campaign.update({
    where: {
      id,
    },
    data: {
      // add raised amount to the campaign
      raised: finalAns.toString(),
    },
  });

  const normalizedDonorWallet = String(donorWallet || "").trim().toLowerCase();
  const effectiveTxHash =
    String(txHash || "").trim() ||
    `manual-${id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (normalizedDonorWallet) {
    await ensureCampaignDonationsTable();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO campaign_donations (id, campaign_id, donor_wallet, donor_name, ngo_wallet, amount_eth, tx_hash, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
      `,
      `offchain-${id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      id,
      normalizedDonorWallet,
      String(donorName || "").trim() || null,
      String(campaign.walletaddress || "").toLowerCase(),
      String(amount),
      effectiveTxHash
    );

    try {
      await prisma.donationTransaction.create({
        data: {
          campaignId: id,
          donorWallet: normalizedDonorWallet,
          ngoWallet: String(campaign.walletaddress || "").toLowerCase(),
          amountEth: String(amount),
          txHash: effectiveTxHash,
        },
      });
    } catch (err) {
      // Ignore duplicate txHash insert errors from repeated submits.
      console.error("Failed to persist donation transaction:", err?.message || err);
    }

    if (String(donorName || "").trim()) {
      await ensureDonationDonorTable();
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO donor_profiles (wallet_address, donor_name, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (wallet_address)
        DO UPDATE SET donor_name = EXCLUDED.donor_name, updated_at = NOW();
        `,
        normalizedDonorWallet,
        String(donorName).trim()
      );
    }
  }
  
  res.json(cam);
});

const port = Number.parseInt(process.env.PORT ?? "", 10) || 5000;
const server = http.createServer(app);

server.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
    const suggestedPort = port + 1;
    console.error(
      `Port ${port} is already in use. Set PORT in be/.env to another value (e.g. PORT=${suggestedPort}).`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(port, () => console.log(`Server running on port ${port}`));

// Remove the CommonJS export since we're using ES modules
// module.exports = app;