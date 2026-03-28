import express from "express";
import {
  signupAdmin,
  login,
  getMe,
  updateMe,
  applyForMembership,
  sendEmailConfirmation,
  confirmEmail,
  checkEmailConfirmed,
} from "../controllers/authController.js";
import { loggedMiddleware } from "../middlewares/authMiddlewares.js";
import { uploadAvatar } from "../middlewares/uploadAvatar.js";
import { allowAll } from "../middlewares/roleMiddlewares.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup-admin", signupAdmin);
router.get("/me", loggedMiddleware, allowAll, getMe);
router.patch(
  "/me",
  loggedMiddleware,
  allowAll,
  uploadAvatar.single("avatar"),
  updateMe
);
router.post("/apply", applyForMembership);
router.post("/send-email-confirmation", sendEmailConfirmation);
router.get("/confirm-email", confirmEmail);
router.get("/check-email-confirmed", checkEmailConfirmed);
import User from '../models/userModel.js';

// PATCH /auth/fcm-token
router.patch('/fcm-token', loggedMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.auth.userId, { fcmToken });
    res.json({ message: 'FCM token sauvegardé' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur sauvegarde token' });
  }
});

export default router;
