import express from 'express';
import {
  getCommitmentCharts,
  getCommitmentChartById,
  getActiveCommitmentChart,
  createCommitmentChart,
  updateCommitmentChart,
  toggleCommitmentChartStatus,
  deleteCommitmentChart
} from '../../controllers/admin/commitmentChartController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isManager } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware);

// Public route for charter signing
router.get('/active',  getActiveCommitmentChart);

// Manager routes
router.get('/', isManager, getCommitmentCharts);
router.get('/:id', isManager, getCommitmentChartById);
router.post('/', isManager, createCommitmentChart);
router.put('/:id', isManager, updateCommitmentChart);
router.patch('/:id/toggle', isManager, toggleCommitmentChartStatus);
router.delete('/:id', isManager, deleteCommitmentChart);

export default router;