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
  acceptMembership,
  refuseMembership,
  getAcceptedMemberships,
  // eliminateUser
} from '../../controllers/admin/userController.js';
import { loggedMiddleware } from '../../middlewares/authMiddlewares.js';
import { isAdmin } from '../../middlewares/roleMiddlewares.js';

const router = express.Router();

router.use(loggedMiddleware, isAdmin);

router.post('/', createUser);
// router.post('/eliminate/:id', eliminateUser);
router.get('/', getUsers);
router.get('/locked', getLockedUsers);
router.patch('/:id', updateUser);
router.delete('/:id', lockUser);
router.delete('/:id/permanent', deleteUserPermanent); // hard‑delete
router.post('/restore/:id', restoreUser);
router.get('/membership-submissions', getMembershipSubmissions);
router.put('/accept/:id', acceptMembership);
router.put("/refuse/:id", refuseMembership);
router.get('/accepted-memberships', getAcceptedMemberships);



export default router;