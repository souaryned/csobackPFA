import express from 'express';
import { loggedMiddleware } from '../middlewares/authMiddlewares.js';
import { isAdmin,  isManager } from '../middlewares/roleMiddlewares.js';
import { getAdminDashboard,  getManagerDashboard } from '../controllers/dashboardController.js';


const router = express.Router();

router.use(loggedMiddleware);

// Admin dashboard route
router.get('/admin', isAdmin, getAdminDashboard);

// Manager dashboard route
router.get('/manager', isManager, getManagerDashboard);

// // Choriste & Chef de choeur dashboard route
// router.get('/choriste-chef', isChoristeOrChef, getChoristeChefDashboard);

export default router;
