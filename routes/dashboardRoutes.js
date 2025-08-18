import express from 'express';
import { loggedMiddleware } from '../middlewares/authMiddlewares.js';
import { isAdmin,  isChefDeChoeur,  isChorister,  isManager } from '../middlewares/roleMiddlewares.js';
import { getAdminDashboard,  getManagerDashboard, getChoristeDashboard, getChefDeChoeurDashboard } from '../controllers/dashboardController.js';


const router = express.Router();

router.use(loggedMiddleware);

// Admin dashboard route
router.get('/admin', isAdmin, getAdminDashboard);

// Manager dashboard route
router.get('/manager', isManager, getManagerDashboard);

// Choriste dashboard route
router.get('/choriste', isChorister, getChoristeDashboard);

router.get('/chef-de-choeur', isChefDeChoeur, getChefDeChoeurDashboard);




export default router;
