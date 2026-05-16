import express from "express";
import {
  createOeuvre,
  getOeuvres,
  updateOeuvre,
  deleteOeuvrePermanent,
  getOeuvreById,
  toggleVisibility,
} from "../../controllers/admin/oeuvreController.js";
import { loggedMiddleware } from "../../middlewares/authMiddlewares.js";
import { allowAll, isAdmin, isAdminOrChefPupitre } from "../../middlewares/roleMiddlewares.js";
import { uploadMedia } from "../../middlewares/uploadMedia.js";

const router = express.Router();

// Toutes les routes nécessitent d'être connecté
router.use(loggedMiddleware);

// ─── Champs de fichiers acceptés ──────────────────────────────────────────────
const mediaFields = uploadMedia.fields([
  { name: "lyrics",    maxCount: 1 },
  { name: "partition", maxCount: 1 },
  { name: "video",     maxCount: 1 },
  { name: "audio",     maxCount: 1 },
]);

// ─── Routes ───────────────────────────────────────────────────────────────────

// Créer une œuvre  (admin ou chef pupitre)
router.post("/", mediaFields, isAdminOrChefPupitre, createOeuvre);

// Lister toutes les œuvres
//   → admin/chefPupitre voit tout  (filtre géré dans le controller)
//   → choriste voit seulement isVisible=true
router.get("/", allowAll, getOeuvres);

// Détail d'une œuvre
router.get("/:id", allowAll, getOeuvreById);

// Modifier une œuvre (admin ou chef pupitre)
router.patch("/:id", mediaFields, isAdminOrChefPupitre, updateOeuvre);

// Basculer visibilité masquer ↔ afficher (admin ou chef pupitre)
router.patch("/:id/visibility", isAdminOrChefPupitre, toggleVisibility);

// Supprimer définitivement (admin uniquement)
router.delete("/:id/permanent", isAdmin, deleteOeuvrePermanent);

export default router;