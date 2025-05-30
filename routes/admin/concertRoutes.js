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
} from "../../controllers/admin/concertController.js";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { allowAll, isAdmin, isChorister } from "../../middlewares/roleMiddlewares.js";
import { uploadPoster } from "../../middlewares/uploadPoster.js";

const router = express.Router();

router.use(loggedMiddleware);

router.get("/", allowAll,getConcerts);
router.post("/", isAdmin,uploadPoster.single("poster"), createConcert);
router.patch("/:id",isAdmin, uploadPoster.single("poster"), updateConcert);
router.delete("/:id/permanent", isAdmin, deleteConcertPermanent);
router.post("/restore/:id", isAdmin, restoreConcert);
router.patch("/:id/availability",  isChorister, markAvailability);
router.get("/:concertId/attendance/:choristeId", isChorister, checkConcertAttendance);
router.get('/:id/available-choristes', getAvailableChoristesForConcert);


export default router;
