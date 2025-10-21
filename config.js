import dotenv from "dotenv";
dotenv.config();

const requiredEnv = ["JWT_SECRET", "MONGO_URI", "BREVO_SMTP_USER", "BREVO_SMTP_PASS"];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://91.134.242.89";

export const SMTP_CONFIG = {
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  user: process.env.BREVO_SMTP_USER,
  pass: process.env.BREVO_SMTP_PASS,
};


export const BREVO_API_KEY = process.env.BREVO_API_KEY;


export const MONGO_URI = process.env.MONGO_URI;
export const PORT = process.env.PORT || 5000;