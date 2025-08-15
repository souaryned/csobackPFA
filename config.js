import dotenv from "dotenv";
dotenv.config(); // ensure .env is loaded

// ------------------- Required env variables -------------------
const requiredEnv = ["JWT_SECRET", "MONGO_URI", "GMAIL_SMTP_USER", "GMAIL_SMTP_PASS"];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// ------------------- Config exports -------------------
export const JWT_SECRET = process.env.JWT_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // dev default

export const SMTP_CONFIG = {
  host: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com", // dev default
  port: Number(process.env.GMAIL_SMTP_PORT) || 587,      // dev default
  user: process.env.GMAIL_SMTP_USER,
  pass: process.env.GMAIL_SMTP_PASS,
};

export const MONGO_URI = process.env.MONGO_URI;
export const PORT = process.env.PORT || 5000; // dev default
