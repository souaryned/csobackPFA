import express from "express";
import {
  createOeuvre,
  getOeuvres,
  updateOeuvre,
  deleteOeuvrePermanent,
  getOeuvreById,
} from "../../controllers/admin/oeuvreController.js";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { allowAll, isAdmin } from "../../middlewares/roleMiddlewares.js";
import { uploadPdf } from "../../middlewares/uploadPdf.js";    // ← import multer

const router = express.Router();

router.use(loggedMiddleware);

// Create → parse both files *and* form fields
router.post(
  "/",
  uploadPdf.fields([
    { name: "lyrics", maxCount: 1 },
    { name: "partition", maxCount: 1 },
  ]),
  isAdmin,
  createOeuvre
);

// Read
router.get("/", isAdmin,getOeuvres);

// Update → same parsing
router.patch(
  "/:id",
  uploadPdf.fields([
    { name: "lyrics", maxCount: 1 },
    { name: "partition", maxCount: 1 },
  ]),
  isAdmin,
  updateOeuvre
);
router.get("/:id",allowAll, getOeuvreById); 

// Permanent delete
router.delete("/:id/permanent",isAdmin, deleteOeuvrePermanent);

export default router;
