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
router.post("/parameters",  saveAuditionParams);
router.get("/parameters", listAuditionParams);
router.get("/parameters/:id", getAuditionParamsById);
router.put("/parameters/:id", updateAuditionParams);
router.delete("/parameters/:id",  deleteAuditionParams);

// Generate & notify
router.post("/generate",generateAuditions);

export default router;
