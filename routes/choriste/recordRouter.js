import express from 'express';

import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import {  isChorister, isManager } from '../../middlewares/roleMiddlewares.js';
import { acceptLeave, declareLeave, getAllLeaves } from '../../controllers/choriste/recordController.js';
import { blockIfOnLeave } from '../../middlewares/blockIfOnLeave.js';

const router = express.Router();

router.use(loggedMiddleware);
router.get('/', isManager,getAllLeaves);
router.post('/:id/declare-leave',blockIfOnLeave,isChorister, declareLeave);
router.put('/:leaveId/accept', isManager, acceptLeave);





export default router;