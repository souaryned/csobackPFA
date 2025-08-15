import express from "express";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { isAdmin, isManager } from "../../middlewares/roleMiddlewares.js";
import {
  deleteAuditionParams,
  getAuditionParamsById,
  listAuditionParams,
  saveAuditionParams,
  updateAuditionParams,
  checkPlanningExists,
  getPlanningDetails,
} from "../../controllers/admin/auditionParamsController.js";
import { generateAuditions, getConfirmedCandidatesForAudition } from "../../controllers/admin/auditionController.js";

const router = express.Router();

router.use(loggedMiddleware, isManager);

// CRUD operations
router.post("/parameters", saveAuditionParams);
router.get("/parameters", listAuditionParams);
router.get("/parameters/:id", getAuditionParamsById);
router.put("/parameters/:id", updateAuditionParams);
router.delete("/parameters/:id", deleteAuditionParams);

// Planning management
router.get("/parameters/:id/slots", checkPlanningExists);
router.get("/parameters/:id/planning", getPlanningDetails);

// Generate & notify
router.post("/generate", generateAuditions);

// Get confirmed candidates for a specific audition planning
router.get('/confirmed-candidates/:planningId', getConfirmedCandidatesForAudition);



export default router;