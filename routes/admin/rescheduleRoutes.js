// routes/adminRescheduleRoutes.js
import express from 'express';
import { 
  getAllRescheduleRequests,
  getRescheduleStatistics,
  getSameDayRescheduleRequests,
  approveSameDayReschedule,
  rejectSameDayReschedule
} from '../../controllers/admin/rescheduleController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import {  isManager } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware,isManager)

// GET: Get all reschedule requests (overview page)
router.get('/requests', getAllRescheduleRequests);

// GET: Get statistics for dashboard
router.get('/statistics', getRescheduleStatistics);

// GET: Get only same-day reschedule requests
router.get('/same-day-requests', getSameDayRescheduleRequests);

// POST: Approve same-day reschedule
router.post('/approve/:candidateId', approveSameDayReschedule);

// POST: Reject same-day reschedule
router.post('/reject/:candidateId', rejectSameDayReschedule);

export default router;