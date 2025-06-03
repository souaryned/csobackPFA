// routes/admin/configRoutes.js
import express from 'express';
import { getConfig, getParticipationThreshold, updateParticipationThreshold, updateSignupActive } from '../../controllers/admin/configController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { allowAll, isAdmin } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();


router.get('/', getConfig);
router.put('/update-signup-active',loggedMiddleware, isAdmin, updateSignupActive);
router.get("/threshold", loggedMiddleware,isAdmin,getParticipationThreshold);
router.put("/threshold", loggedMiddleware,isAdmin, updateParticipationThreshold);
export default router;
