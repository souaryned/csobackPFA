// routes/admin/concertRoutes.js
import express from "express";
import {
  createConcert,
  getConcerts,
  updateConcert,
  restoreConcert,
  deleteConcertPermanent,
  markAvailability,
  checkConcertAttendance,
  getAvailableChoristesForConcert,
   validateChoristeForConcert,           // NEW
  getAvailableChoristesForValidation,   // NEW
  getFinalParticipantsForConcert,       // NEW
  deleteFromFinalParticipants,          // NEW
   getFinalParticipantsForChef,
  removeFromFinalParticipantsAsChef,
  getConcertsForChefFinalParticipants,
   markConcertAbsence,
  autoMarkAbsentForPastConcert,
  getConcertStatusForChoriste,
} from "../../controllers/admin/concertController.js";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { allowAll, isAdmin, isChorister } from "../../middlewares/roleMiddlewares.js";
import { uploadPoster } from "../../middlewares/uploadPoster.js";
import { blockIfOnLeave } from "../../middlewares/blockIfOnLeave.js";

const router = express.Router();

router.use(loggedMiddleware);

router.get("/", allowAll,getConcerts);
router.post("/", isAdmin,uploadPoster.single("poster"), createConcert);
router.patch("/:id",isAdmin, uploadPoster.single("poster"), updateConcert);
router.delete("/:id/permanent", isAdmin, deleteConcertPermanent);
router.post("/restore/:id", isAdmin, restoreConcert);
router.patch("/:id/availability",  blockIfOnLeave,isChorister, markAvailability);
router.get("/:concertId/attendance/:choristeId", blockIfOnLeave,isChorister, checkConcertAttendance);
router.get('/:id/available-choristes',isAdmin, getAvailableChoristesForConcert);
// ✅ NEW: Validation routes
router.post('/:concertId/validate/:choristeId', isAdmin, validateChoristeForConcert);
router.get('/:concertId/available-for-validation', isAdmin, getAvailableChoristesForValidation);

// ✅ NEW: Final participants routes  
router.get('/:concertId/final-participants', allowAll, getFinalParticipantsForConcert);
router.delete('/:concertId/final-participants/:choristeId', isAdmin, deleteFromFinalParticipants);

router.get('/chef-pupitre/concerts-with-participants', isChorister, getConcertsForChefFinalParticipants);
router.get('/:concertId/chef-pupitre/final-participants', isChorister, getFinalParticipantsForChef);
router.delete('/:concertId/chef-pupitre/final-participants/:choristeId', blockIfOnLeave, isChorister, removeFromFinalParticipantsAsChef);


router.post('/:id/absence', blockIfOnLeave, isChorister, markConcertAbsence);
router.post('/:concertId/auto-mark-absent', isAdmin, autoMarkAbsentForPastConcert);
router.get('/:concertId/status/:choristeId', allowAll, getConcertStatusForChoriste);



export default router;
