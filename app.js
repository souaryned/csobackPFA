// app.js
import express from "express";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { MONGO_URI } from "./config.js";


import authRoute from "./routes/authRoutes.js";
import userRoutes from "./routes/admin/userRoutes.js";
import oeuvreRoutes from "./routes/admin/oeuvreRoutes.js";
import concertRoutes from "./routes/admin/concertRoutes.js";
import repetitionRoutes from "./routes/admin/repetitionRoutes.js";
import recordRouter from "./routes/choriste/recordRouter.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import configRouter from "./routes/admin/configRoutes.js";
import auditionRouter from "./routes/admin/auditionsRoutes.js"
import convocationRoutes from "./routes/convocationRoutes.js";
import auditionEvaluationRoutes from './routes/admin/auditionEvaluationRoutes.js';
import rescheduleRoutes from "./routes/admin/rescheduleRoutes.js";
import chefPupitreRoutes from './routes/admin/chefPupitreRoutes.js';
import eliminationRoutes from "./routes/admin/eliminationRoutes.js";
import commitmentChartRoutes from './routes/admin/commitmentChartRoutes.js';
import messageRoutes from './routes/admin/messageRoutes.js';


import { scheduleRepetitionReminders } from "./tools/cron/repetitionReminderJob.js";
import { restoreExpiredLeaves } from "./tools/cron/restoreLeaves.js"
import { startUserCleanupJob } from "./tools/cron/cleanupExpiredUsers.js";
import { startReminderSystem } from "./tools/cron/reminderConvocation.js";
// import autoDeleteExpiredConvocations from "./tools/cron/autoDeleteExpiredConvocations.js";

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());

// Serve everything in uploads/
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Vos routes
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
app.use('/audition-evaluations', auditionEvaluationRoutes);
app.use('/chef-pupitre', chefPupitreRoutes);
app.use('/elimination', eliminationRoutes);
app.use('/commitment-charts', commitmentChartRoutes);
app.use('/messages', messageRoutes);


// Cron job pour les rappels de répétition
scheduleRepetitionReminders();
// Cron job pour nettoyer les utilisateurs expirés
startUserCleanupJob();
// Cron job pour les rappels de convocation
startReminderSystem();
// autoDeleteExpiredConvocations.start();

// Connexion MongoDB et appel à restoreExpiredLeaves
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to database choeur_cso_bd");
    try {
      await restoreExpiredLeaves();
      // console.log("Congés expirés restaurés.");
    } catch (err) {
      console.error("Erreur restoreExpiredLeaves :", err);
    }
  })
  .catch((err) => {
    console.error("Won't connect to database choeur_cso_bd", err);
  });


export default app;
