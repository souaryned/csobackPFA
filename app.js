// app.js
import express from "express";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { MONGO_URI } from "./config.js";

// Routes
import authRoute from "./routes/authRoutes.js";
import userRoutes from "./routes/admin/userRoutes.js";
import oeuvreRoutes from "./routes/admin/oeuvreRoutes.js";
import concertRoutes from "./routes/admin/concertRoutes.js";
import repetitionRoutes from "./routes/admin/repetitionRoutes.js";
import recordRouter from "./routes/choriste/recordRouter.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import configRouter from "./routes/admin/configRoutes.js";
import auditionRouter from "./routes/admin/auditionsRoutes.js";
import convocationRoutes from "./routes/convocationRoutes.js";
import auditionEvaluationRoutes from "./routes/admin/auditionEvaluationRoutes.js";
import rescheduleRoutes from "./routes/admin/rescheduleRoutes.js";
import chefPupitreRoutes from "./routes/admin/chefPupitreRoutes.js";
import eliminationRoutes from "./routes/admin/eliminationRoutes.js";
import commitmentChartRoutes from "./routes/admin/commitmentChartRoutes.js";
import messageRoutes from "./routes/admin/messageRoutes.js";

// ✅ IMPORTANT : import des DEUX routers
import { chefRouter, choristeRouter } from "./routes/admin/chefPupitrePresenceRoutes.js";

// Cron jobs
import { scheduleRepetitionReminders } from "./tools/cron/repetitionReminderJob.js";
import { restoreExpiredLeaves } from "./tools/cron/restoreLeaves.js";
import { startUserCleanupJob } from "./tools/cron/cleanupExpiredUsers.js";
import { startReminderSystem } from "./tools/cron/reminderConvocation.js";

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ─── Fichiers statiques ───────────────────────────────────────────────────────
// Sert tous les uploads : PDFs, vidéos, audios
// GET /uploads/documents/fichier.pdf
// GET /uploads/videos/fichier.mp4
// GET /uploads/audios/fichier.mp3
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes principales ───────────────────────────────────────────────────────
app.use("/auth", authRoute);
app.use("/leave", recordRouter);
app.use("/users", userRoutes);
app.use("/oeuvres", oeuvreRoutes);
app.use("/concerts", concertRoutes);
app.use("/repetition", repetitionRoutes);
app.use("/dashboard", dashboardRouter);
app.use("/config", configRouter);
app.use("/auditions", auditionRouter);
app.use("/convocation", convocationRoutes);
app.use("/reschedule", rescheduleRoutes);
app.use("/audition-evaluations", auditionEvaluationRoutes);
app.use("/elimination", eliminationRoutes);
app.use("/commitment-charts", commitmentChartRoutes);
app.use("/messages", messageRoutes);

// ✅ NOUVELLES ROUTES présence (corrigées)
app.use("/chef-pupitre", chefRouter);
app.use("/choriste", choristeRouter);

// ✅ Anciennes routes admin chef pupitre (à garder)
app.use("/chef-pupitre", chefPupitreRoutes);

// ─── Cron jobs ────────────────────────────────────────────────────────────────
scheduleRepetitionReminders();
startUserCleanupJob();
startReminderSystem();

// ─── Connexion MongoDB ────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to database choeur_cso_bd");
    try {
      await restoreExpiredLeaves();
    } catch (err) {
      console.error("Erreur restoreExpiredLeaves :", err);
    }
  })
  .catch((err) => {
    console.error("Won't connect to database choeur_cso_bd", err);
  });

export default app;