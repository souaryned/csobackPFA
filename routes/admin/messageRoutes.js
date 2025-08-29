import express from 'express';
import { sendManagerBroadcast, sendChefPupitreMessage } from '../../controllers/admin/messageController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isManager, isChorister } from '../../middlewares/roleMiddlewares.js';
import { blockIfOnLeave } from '../../middlewares/blockIfOnLeave.js';

const router = express.Router();

// Manager broadcast to all choristes
router.post('/manager/broadcast', loggedMiddleware, isManager, sendManagerBroadcast);

// Chef de pupitre message to pupitre members
router.post('/chef-pupitre/message', loggedMiddleware, blockIfOnLeave, isChorister, sendChefPupitreMessage);

export default router;