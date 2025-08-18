import express from 'express';
import {
  getChefsPupitre,
  getAvailableChoristesForPupitre,
  assignChefDePupitre,
  removeChefDePupitre
} from '../../controllers/admin/chefPupitreController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isManager } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

// All routes require manager authentication
router.use(loggedMiddleware, isManager);

// Get all chefs de pupitre organized by pupitre
router.get('/', getChefsPupitre);

// Get available choristes for a specific pupitre
router.get('/available/:pupitre', getAvailableChoristesForPupitre);

// Assign chef de pupitre
router.post('/assign/:userId', assignChefDePupitre);

// Remove chef de pupitre
router.delete('/remove/:userId', removeChefDePupitre);

export default router;