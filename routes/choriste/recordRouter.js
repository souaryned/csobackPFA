import express from 'express';

import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import {  isChorister, isManager } from '../../middlewares/roleMiddlewares.js';
import { acceptLeave, declareLeave, getAllLeaves } from '../../controllers/choriste/recordController.js';

const router = express.Router();

router.use(loggedMiddleware);
router.get('/', loggedMiddleware, isManager,getAllLeaves);
router.post('/:id/declare-leave',isChorister, declareLeave);
router.put('/:leaveId/accept', loggedMiddleware, isManager, acceptLeave);





export default router;