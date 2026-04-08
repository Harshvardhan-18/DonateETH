import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import sgMail from "@sendgrid/mail";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import genaiRoute from './genai.js';
import { buildAdminRouter } from "./admin/router.js";
import { buildNgoRouter } from "./ngo/router.js";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(express.json());
app.use(cors());
app.use('/genai', genaiRoute)
app.use("/admin", buildAdminRouter(prisma));
app.use("/ngos", buildNgoRouter(prisma));

const otpStorage = {};

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
  otpStorage[email] = otp;

  const message = {
    to: email,
    from: "aniketwarule775@gmail.com",
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
  };

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    await sgMail.send(message);
    res.json({ success: true, message: "OTP sent successfully", otp }); // Remove OTP in real implementation
  } catch (error) {
    console.error("Error sending OTP:", error.response ? error.response.body : error.message);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  if (otpStorage[email] && otpStorage[email].toString() == code) {
    delete otpStorage[email]; // Remove OTP after verification
    return res.json({ success: true, message: "OTP Verified!" });
  }

  res.json({ success: false, message: "Invalid OTP" });
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, 'uploads');
    
    // Create the uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure multer upload
const upload = multer({ 
  storage,
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
    
    // Handle file paths
    let imageUrl = null;
    let certificateUrl = null;
    let supportingDocUrl = null;
    
    // Process uploaded files if they exist
    if (req.files) {
      if (req.files.imageUrl && req.files.imageUrl[0]) {
        imageUrl = `/uploads/${req.files.imageUrl[0].filename}`;
      } else if (imageUrlLink) {
        imageUrl = imageUrlLink;
      }
      
      if (req.files.certificateFile && req.files.certificateFile[0]) {
        certificateUrl = `/uploads/${req.files.certificateFile[0].filename}`;
        console.log(certificateUrl)
      }
      
      if (req.files.supportingDocFile && req.files.supportingDocFile[0]) {
        supportingDocUrl = `/uploads/${req.files.supportingDocFile[0].filename}`;
        console.log(supportingDocUrl)
      }
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

// Serve uploaded files statically
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.get('/campaigns', async (req, res) => {
  const result = await prisma.campaign.findMany({});
  res.json(result);
});

app.get('/milestones', async (req, res) => {
  const result = await prisma.milestone.findMany();
  res.json(result);
});

app.get('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id)
  const result = await prisma.campaign.findUnique({
    where: {
      id,
    },
  });
  res.json(result);
});

app.post('/campaigns/:id/updateRaised', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;


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