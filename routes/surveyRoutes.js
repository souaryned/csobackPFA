import express from 'express';
import { loggedMiddleware } from '../middlewares/authMiddlewares.js';
import {
  getSurveys,
  getSurveyById,
  soumettreReponses,
  getMaReponse,
  createSurvey,
  updateSurvey,
  updateStatut,
  deleteSurvey,
  getResultats,
  getTemplates,
  notifySurveyTargets,
} from '../controllers/admin/surveyController.js';

const router = express.Router();

router.get('/templates', loggedMiddleware, getTemplates);
router.get('/', loggedMiddleware, getSurveys);
router.get('/:id', loggedMiddleware, getSurveyById);
router.get('/:id/ma-reponse', loggedMiddleware, getMaReponse);
router.get('/:id/resultats', loggedMiddleware, getResultats);
router.post('/', loggedMiddleware, createSurvey);
router.post('/:id/reponses', loggedMiddleware, soumettreReponses);
router.post('/:id/notify', loggedMiddleware, notifySurveyTargets);
router.patch('/:id/statut', loggedMiddleware, updateStatut);
router.patch('/:id', loggedMiddleware, updateSurvey);
router.delete('/:id', loggedMiddleware, deleteSurvey);

export default router;