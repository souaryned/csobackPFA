import express from 'express';
import {
  createEvaluation,
  updateEvaluation,
  getEvaluation,
  getTessitureOptions,
  getPlanningEvaluations,
} from '../../controllers/admin/auditionEvaluationController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isAdmin, isManager } from '../../middlewares/roleMiddlewares.js';


const router = express.Router();

// All routes require authentication
router.use(loggedMiddleware,isManager);

// Create new evaluation
router.post('/', createEvaluation);

// Update existing evaluation
router.put('/:evaluationId', updateEvaluation);

// Get evaluation by candidate and audition slot
router.get('/candidate/:candidateId/slot/:auditionSlotId', getEvaluation);

// Get tessiture options for a candidate
router.get('/tessiture-options/:candidateId', getTessitureOptions);

// Get all evaluations for a planning (optional)
router.get('/planning/:planningId', getPlanningEvaluations);


export default router;