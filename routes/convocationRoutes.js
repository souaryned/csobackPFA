// routes/convocationRoutes.js
import express from 'express';
import { 
  getAvailableTimes,
  getConvocationResponse, 
  handleConvocationResponse, 
} from '../controllers/convocationController.js';

const router = express.Router();

// PUBLIC ROUTES (for candidates)
// GET: Display convocation response page
router.get('/response/:candidateId', getConvocationResponse);

// POST: Handle convocation response (confirm/decline/reschedule)
router.post('/response/:candidateId', handleConvocationResponse);

// GET: Fetch available times for a candidate
router.get('/available-times/:candidateId', getAvailableTimes);

// ADMIN ROUTES (for administration)
// POST: Manual trigger for auto-decline expired convocations
// router.post('/admin/auto-decline', triggerAutoDecline);

export default router;