import express from 'express';
import {
  getConcertAbsenceReport,
  sendWarningNotifications,
  eliminateChoriste,
  getConcertAbsenceReportWithValidation,
  sendComprehensiveWarningNotifications
} from '../../controllers/admin/eliminationController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isAdmin, isManager } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware);

// Absence analysis and notifications
router.get('/concert/:concertId', isAdmin, getConcertAbsenceReport);
router.post('/concert/:concertId/warnings', isAdmin, sendWarningNotifications);
router.post('/eliminate/:choristeId', isAdmin, eliminateChoriste);
router.get('/concert/:concertId/validation-analysis', isAdmin, getConcertAbsenceReportWithValidation);
router.post('/send-comprehensive-warnings', isManager, sendComprehensiveWarningNotifications);
export default router;