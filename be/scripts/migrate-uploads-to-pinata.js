import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const uploadsDir = path.join(projectRoot, "uploads");

dotenv.config({ path: path.join(projectRoot, ".env") });

const prisma = new PrismaClient();
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
    "Pinata credentials are missing or invalid. Set PINATA_JWT to a real JWT or provide PINATA_API_KEY and PINATA_API_SECRET."
  );
}

function isLocalUpload(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function toLocalFilename(value) {
  return path.basename(String(value || ""));
}

async function uploadToPinata(filePath, fileName) {
  const fileBuffer = await fs.readFile(filePath);
  const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: fileName,
      keyvalues: { source: "donateeth-local-migration" },
    })
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: getPinataAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed for ${fileName}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return `${pinataGatewayBase}${data.IpfsHash}`;
}

async function main() {
  getPinataAuthHeaders();

  const files = await fs.readdir(uploadsDir).catch(() => []);
  if (!files.length) {
    console.log("No local uploads found in be/uploads. Nothing to migrate.");
    return;
  }

  const localFiles = files.filter(Boolean);
  const urlByFileName = new Map();

  console.log(`Found ${localFiles.length} local file(s) to migrate.`);

  for (const fileName of localFiles) {
    const filePath = path.join(uploadsDir, fileName);
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats || !stats.isFile()) continue;

    console.log(`Uploading ${fileName} to Pinata...`);
    const gatewayUrl = await uploadToPinata(filePath, fileName);
    urlByFileName.set(fileName, gatewayUrl);
    console.log(`Pinned ${fileName} -> ${gatewayUrl}`);
  }

  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      imageUrl: true,
      certificateUrl: true,
      supportingDocUrl: true,
    },
  });

  for (const campaign of campaigns) {
    const updates = {};

    if (isLocalUpload(campaign.imageUrl)) {
      const fileName = toLocalFilename(campaign.imageUrl);
      if (urlByFileName.has(fileName)) updates.imageUrl = urlByFileName.get(fileName);
    }
    if (isLocalUpload(campaign.certificateUrl)) {
      const fileName = toLocalFilename(campaign.certificateUrl);
      if (urlByFileName.has(fileName)) updates.certificateUrl = urlByFileName.get(fileName);
    }
    if (isLocalUpload(campaign.supportingDocUrl)) {
      const fileName = toLocalFilename(campaign.supportingDocUrl);
      if (urlByFileName.has(fileName)) updates.supportingDocUrl = urlByFileName.get(fileName);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: updates,
      });
      console.log(`Updated campaign ${campaign.id}`);
    }
  }

  const verifications = await prisma.$queryRawUnsafe(
    `SELECT campaign_id, doc_type, document_url FROM admin_document_verifications;`
  );

  for (const row of verifications) {
    if (!isLocalUpload(row.document_url)) continue;

    const fileName = toLocalFilename(row.document_url);
    const gatewayUrl = urlByFileName.get(fileName);
    if (!gatewayUrl) continue;

    await prisma.$executeRawUnsafe(
      `
      UPDATE admin_document_verifications
      SET document_url = $1
      WHERE campaign_id = $2 AND doc_type = $3 AND document_url = $4;
      `,
      gatewayUrl,
      row.campaign_id,
      row.doc_type,
      row.document_url
    );
    console.log(`Updated verification ${row.campaign_id} / ${row.doc_type}`);
  }

  console.log("Migration complete.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });