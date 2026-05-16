// routes/chefPupitre/chefPupitrePresenceRoutes.js
import express from 'express';
import {
  getPresencesForChef,
  updateChoristPresence,
  sendMessageToChorist,
  validateAndSendPresenceList,
  getChefMessages,
  getChoristMessages,
  getChoristesForPupitre,
} from '../../controllers/admin/chefPupitrePresenceController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isChefDePupitre, isChoriste } from '../../middlewares/roleMiddlewares.js';

// ── Router chef-pupitre  (monté sous /chef-pupitre dans app.js) ───────────────
const chefRouter = express.Router();

// GET  /chef-pupitre/repetition-active/presences
chefRouter.get(
  '/repetition-active/presences',
  loggedMiddleware,
  isChefDePupitre,
  getPresencesForChef
);

// PATCH /chef-pupitre/repetition/:repetitionId/choriste/:userId/presence
chefRouter.patch(
  '/repetition/:repetitionId/choriste/:userId/presence',
  loggedMiddleware,
  isChefDePupitre,
  updateChoristPresence
);

// POST /chef-pupitre/message
chefRouter.post(
  '/message',
  loggedMiddleware,
  isChefDePupitre,
  sendMessageToChorist
);

// POST /chef-pupitre/repetition/:repetitionId/validate-presences
chefRouter.post(
  '/repetition/:repetitionId/validate-presences',
  loggedMiddleware,
  isChefDePupitre,
  validateAndSendPresenceList
);

// GET  /chef-pupitre/messages
chefRouter.get(
  '/messages',
  loggedMiddleware,
  isChefDePupitre,
  getChefMessages
);

// GET  /chef-pupitre/choristes
// Liste des choristes du pupitre (sans répétition requise)
chefRouter.get(
  '/choristes',
  loggedMiddleware,
  isChefDePupitre,
  getChoristesForPupitre
);

// ── Router choriste  (monté sous /choriste dans app.js) ───────────────────────
const choristeRouter = express.Router();

// GET  /choriste/messages  ← route séparée, middleware isChoriste (pas isChefDePupitre)
choristeRouter.get(
  '/messages',
  loggedMiddleware,
  isChoriste,
  getChoristMessages
);

export { chefRouter, choristeRouter };