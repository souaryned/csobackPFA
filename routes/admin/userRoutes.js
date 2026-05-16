import express from "express";
import {
  createUser,
  getUsers,
  getLockedUsers,
  updateUser,
  lockUser,
  restoreUser,
  deleteUserPermanent,
  getMembershipSubmissions,
  refuseMembership,
  getAcceptedMemberships,
  updatePupitre,
  getActiveChoristes,
  acceptMembership,
  getAvailableTimeSlots,
  getAvailableDates,
  getScheduledCandidatesWithSlots,
  acceptRetenuCandidates,
  getCharterForSigning,
  signCharter,
  getChoristesByPupitre,
  getReminderPreferences, // ✅ NOUVEAU
  updateReminderPreferences, // ✅ NOUVEAU
} from "../../controllers/admin/userController.js";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import {
  isAdmin,
  isManager,
  isManagerOrChef,
} from "../../middlewares/roleMiddlewares.js";

const router = express.Router();

// User management routes
router.post("/", loggedMiddleware, isAdmin, createUser);
router.get("/", loggedMiddleware, isAdmin, getUsers);
router.get("/locked", loggedMiddleware, isAdmin, getLockedUsers);
router.patch("/:id", loggedMiddleware, isAdmin, updateUser);
router.delete("/:id", loggedMiddleware, isAdmin, lockUser);
router.delete("/:id/permanent", loggedMiddleware, isAdmin, deleteUserPermanent);
router.post("/restore/:id", loggedMiddleware, isAdmin, restoreUser);
// router.post('/eliminate/:id', eliminateUser);
// Membership management routes
router.get(
  "/membership-submissions",
  loggedMiddleware,
  isManager,
  getMembershipSubmissions,
);
router.get(
  "/scheduled-with-slots",
  loggedMiddleware,
  isManager,
  getScheduledCandidatesWithSlots,
);
router.put("/accept/:id", loggedMiddleware, isManager, acceptMembership);
router.get(
  "/manager/choristes",
  loggedMiddleware,
  isManager,
  getChoristesByPupitre,
);

// ✅ UPDATED: Charter-based bulk acceptance
router.post(
  "/accept-retenu-candidates",
  loggedMiddleware,
  isManager,
  acceptRetenuCandidates,
);

// ✅ NOUVEAU : Routes préférences rappel (choriste connecté)
router.get(
  "/me/reminder-preferences",
  loggedMiddleware,
  getReminderPreferences,
);
router.patch(
  "/me/reminder-preferences",
  loggedMiddleware,
  updateReminderPreferences,
);

// Other membership routes
router.put("/refuse/:id", loggedMiddleware, isManager, refuseMembership);
router.get(
  "/available-time-slots",
  loggedMiddleware,
  isManager,
  getAvailableTimeSlots,
);
router.get("/available-dates", loggedMiddleware, isManager, getAvailableDates);
router.get(
  "/accepted-memberships",
  loggedMiddleware,
  isManagerOrChef,
  getAcceptedMemberships,
);
router.put("/:userId/voc-pupitre", loggedMiddleware, isManager, updatePupitre);
router.get("/active", loggedMiddleware, isManager, getActiveChoristes);

// ✅ NEW: Charter signing routes (public - no auth needed for token-based access)
router.get("/charter/sign/:token", getCharterForSigning);
router.post("/charter/sign/:token", signCharter);

export default router;
