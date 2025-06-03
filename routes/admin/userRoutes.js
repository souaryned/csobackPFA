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
  sendTestDates,
  // eliminateUser
} from '../../controllers/admin/userController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isAdmin, isAdminOrChef, isManager } from '../../middlewares/roleMiddlewares.js';

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
router.get('/membership-submissions', isAdmin,getMembershipSubmissions);
// router.put('/accept/:id', isAdmin,acceptMembership);
router.put("/refuse/:id", isAdmin,refuseMembership);
router.get('/accepted-memberships', isAdminOrChef,getAcceptedMemberships);
router.put('/:userId/voc-pupitre', isManager, updatePupitre);
router.get('/active', isManager,getActiveChoristes);
router.post("/send-test-dates", sendTestDates);


export default router;