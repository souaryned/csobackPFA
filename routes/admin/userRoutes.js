import express from 'express';
import {
  createUser,
  getUsers,
  getLockedUsers,
  updateUser,
  lockUser,
  restoreUser,
  deleteUserPermanent,
  getMembershipSubmissions,
  // acceptMembership,
  refuseMembership,
  getAcceptedMemberships,
  updatePupitre,
  getActiveChoristes,
  acceptMembership,
  getAvailableTimeSlots,
  getAvailableDates,
  getScheduledCandidatesWithSlots,
  acceptRetenuCandidates,
  // eliminateUser
} from '../../controllers/admin/userController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isAdmin, isAdminOrChef, isManager, isManagerOrChef } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware);

router.post('/', createUser);
// router.post('/eliminate/:id', eliminateUser);
router.get('/', isAdmin,getUsers);
router.get('/locked', isAdmin,getLockedUsers);
router.patch('/:id', isAdmin,updateUser);
router.delete('/:id', isAdmin,lockUser);
router.delete('/:id/permanent', isAdmin,deleteUserPermanent); // hard‑delete
router.post('/restore/:id', isAdmin,restoreUser);



// Membership management
router.get('/membership-submissions', isManager,getMembershipSubmissions);
router.get('/scheduled-with-slots', isManager, getScheduledCandidatesWithSlots);
router.put('/accept/:id', isManager,acceptMembership);
router.post('/accept-retenu-candidates',isManager, acceptRetenuCandidates);
router.put("/refuse/:id", isManager,refuseMembership);
router.get('/available-time-slots', isManager, getAvailableTimeSlots); // NEW  
router.get('/available-dates', isManager, getAvailableDates); // NEW
router.get('/accepted-memberships', isManagerOrChef,getAcceptedMemberships);
router.put('/:userId/voc-pupitre', isManager, updatePupitre);
router.get('/active', isManager,getActiveChoristes);


export default router;