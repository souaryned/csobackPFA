import express from "express";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname} from "path";

import authRoute from "./routes/authRoutes.js";
import userRoutes from "./routes/admin/userRoutes.js";
import oeuvreRoutes from "./routes/admin/oeuvreRoutes.js";
import concertRoutes from "./routes/admin/concertRoutes.js";
import repetitionRoutes from "./routes/admin/repetitionRoutes.js";
import recordRouter from "./routes/choriste/recordRouter.js";
import dashboardRouter from "./routes/dashboardRoutes.js"

import { scheduleRepetitionReminders } from "./tools/cron/repetitionReminderJob.js";


// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());

// ─── Serve everything in uploads/ (images & PDFs) ─────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ─── Your other routes ────────────────────────────────────────────
app.use("/auth", authRoute);
app.use("/leave", recordRouter);
app.use("/users", userRoutes);
app.use("/oeuvres", oeuvreRoutes);
app.use("/concerts", concertRoutes);
app.use("/repetition", repetitionRoutes);
app.use("/dashboard", dashboardRouter);


// ─── Cron job ─────────────────────────────────
scheduleRepetitionReminders();

// ─── MongoDB connection ───────────────────────────────────────────
mongoose
  .connect("mongodb://localhost/choeur_cso_bd")
  .then(() => {
    console.log("Connected to database choeur_cso_bd");
  })
  .catch((err) => {
    console.error("Won't connect to database choeur_cso_bd", err);
  });

export default app;
