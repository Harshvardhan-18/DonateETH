import dotenv from "dotenv";

dotenv.config();

export const adminConfig = {
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  adminEmail: process.env.ADMIN_EMAIL || "admin@donateeth.org",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123",
  rpcUrl: process.env.ETH_RPC_URL || "",
  donationContractAddress: process.env.DONATION_CONTRACT_ADDRESS || "",
  pinataGatewayBase: process.env.PINATA_GATEWAY_BASE || "https://gateway.pinata.cloud/ipfs/",
  ethToInr: Number.parseFloat(process.env.ETH_TO_INR_RATE || "300000"),
};
