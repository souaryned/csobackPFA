// routes/choriste/choristeRoutes.js
import express from "express";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import {
  getAllMyReminders,
  getMyReminder,
  setMyReminder, // compat legacy (single reminder)
  addMyReminder, // ajouter un rappel
  deleteMyReminder, // supprimer un rappel précis
  deleteAllMyReminders, // supprimer tous les rappels
} from "../../controllers/choriste/reminderController.js";

const router = express.Router();

// ⚠️ ORDRE CRITIQUE : routes fixes AVANT les routes paramétrées

// GET tous mes rappels (dashboard) → { repId: [min1, min2, ...] }
router.get("/repetitions/my-reminders", loggedMiddleware, getAllMyReminders);

// GET rappels pour une répétition précise
router.get("/repetitions/:repId/reminder", loggedMiddleware, getMyReminder);

// POST ajouter un rappel (multi-rappels)
router.post("/repetitions/:repId/reminder", loggedMiddleware, addMyReminder);

// DELETE supprimer un rappel précis par son délai
router.delete(
  "/repetitions/:repId/reminder/:minutes",
  loggedMiddleware,
  deleteMyReminder,
);

// DELETE supprimer TOUS les rappels d'une répétition
router.delete(
  "/repetitions/:repId/reminders",
  loggedMiddleware,
  deleteAllMyReminders,
);

// PATCH compat legacy (remplace par un seul rappel, ou null = supprimer tout)
router.patch("/repetitions/:repId/reminder", loggedMiddleware, setMyReminder);

export default router;
