import express from 'express';
import {
  createRepetition,
  getRepetitions,
  updateRepetition,
  deleteRepetitionPermanent,
  getAttendanceForConcert,
  getRepetitionsByConcert,
  markRepetitionPresence,
  markRepetitionAbsence,
  getMyChoristesStatus,
  addManualPresence,
  removeManualPresence,
  getManagerAbsenceReport,
  getRepetitionsForManager,
  modifyRepetitionForAllChoristes,
  getComprehensiveAbsenceReport
} from '../../controllers/admin/repetitionController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { allowAll, isAdmin, isChorister, isChoristerOrAdminOrManager, isManager } from '../../middlewares/roleMiddlewares.js';
import { blockIfOnLeave } from '../../middlewares/blockIfOnLeave.js';

const router = express.Router();

router.use(loggedMiddleware);

// Existing routes
router.post('/', isAdmin, createRepetition);
router.get('/', isChoristerOrAdminOrManager, getRepetitions);
router.post("/:id/presence",  blockIfOnLeave, isChorister, markRepetitionPresence);
router.post("/:id/absence", blockIfOnLeave, isChorister, markRepetitionAbsence);
router.get('/attendance/:concertId', isAdmin, getAttendanceForConcert);
router.get("/concert/:concertId", allowAll, getRepetitionsByConcert);
router.patch('/:id', isAdmin, updateRepetition);
router.delete('/:id/permanent', isAdmin, deleteRepetitionPermanent);
router.get('/manager/absence-report', isManager, getManagerAbsenceReport);


// ✅ NEW: Chef de pupitre presence management routes
router.get('/:id/chef-pupitre/my-choristes', isChorister, getMyChoristesStatus);
router.post('/:id/chef-pupitre/manual-presence', blockIfOnLeave,isChorister, addManualPresence);
router.delete('/:id/chef-pupitre/manual-presence/:choristeId', blockIfOnLeave,isChorister, removeManualPresence);
router.get('/manager/repetitions', isManager, getRepetitionsForManager);
router.post('/:id/manager/modify', isManager, modifyRepetitionForAllChoristes);
router.get('/comprehensive-absence-report', isManager, getComprehensiveAbsenceReport);

export default router;