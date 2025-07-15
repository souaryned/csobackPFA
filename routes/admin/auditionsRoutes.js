// routes/auditions.js
import express from "express";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { isAdmin } from "../../middlewares/roleMiddlewares.js";
import {
  deleteAuditionParams,
  getAuditionParamsById,
  listAuditionParams,
  saveAuditionParams,
  updateAuditionParams,
} from "../../controllers/admin/auditionParamsController.js";
import { generateAuditions } from "../../controllers/admin/auditionController.js";

const router = express.Router();

router.use(loggedMiddleware, isAdmin);
router.post("/parameters", isAdmin, saveAuditionParams);
router.get("/parameters", isAdmin, listAuditionParams);
router.get("/parameters/:id", isAdmin, getAuditionParamsById);
router.put("/parameters/:id", isAdmin, updateAuditionParams);
router.delete("/parameters/:id", isAdmin, deleteAuditionParams);

// Generate & notify
router.post("/generate",generateAuditions);

export default router;
