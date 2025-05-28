import express from "express";
import { signupAdmin, login, getMe, updateMe } from "../controllers/authController.js";
import { loggedMiddleware } from '../middlewares/authMiddlewares.js';
import { uploadAvatar } from "../middlewares/uploadAvatar.js";
import { allowAll } from "../middlewares/roleMiddlewares.js";
const router = express.Router();

router.post("/login", login);
router.post("/signup-admin", signupAdmin);
router.get('/me', loggedMiddleware, allowAll, getMe);
router.patch('/me', loggedMiddleware, allowAll, uploadAvatar.single('avatar'), updateMe);


export default router;
