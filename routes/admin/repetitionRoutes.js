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
} from '../../controllers/admin/repetitionController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { allowAll, isAdmin, isChorister, isChoristerOrAdmin } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware);

router.post('/', isAdmin,createRepetition);
router.get('/', isChoristerOrAdmin,getRepetitions);
router.post("/:id/presence", loggedMiddleware, isChorister, markRepetitionPresence);
router.get('/attendance/:concertId', isAdmin,getAttendanceForConcert);
router.get("/concert/:concertId", allowAll,getRepetitionsByConcert);
router.patch('/:id', isAdmin,updateRepetition);
router.delete('/:id/permanent', isAdmin,deleteRepetitionPermanent);
router.post("/:id/absence", isChorister, markRepetitionAbsence);


export default router;