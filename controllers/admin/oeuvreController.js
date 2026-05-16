import Oeuvre from "../../models/oeuvreModel.js";

// ─── Helper : gère les erreurs de format fichier ──────────────────────────────
const handleFileError = (error, res) => {
  if (error.code === "INVALID_FILE_FORMAT" || error.code === "INVALID_PDF_FORMAT") {
    return res.status(400).json({
      message: `Format de fichier invalide${error.field ? " pour le champ « " + error.field + " »" : ""}.`,
      type: "FILE_FORMAT_ERROR",
    });
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "Fichier trop volumineux (max 200 Mo).",
      type: "FILE_SIZE_ERROR",
    });
  }
  return null; // pas une erreur fichier
};

// ─── Helper : extrait les noms de fichiers uploadés ───────────────────────────
const extractFiles = (files = {}) => ({
  ...(files.lyrics?.[0]    && { lyrics:    files.lyrics[0].filename }),
  ...(files.partition?.[0] && { partition: files.partition[0].filename }),
  ...(files.video?.[0]     && { video:     files.video[0].filename }),
  ...(files.audio?.[0]     && { audio:     files.audio[0].filename }),
});

// ─────────────────────────────────────────────────────────────────────────────
// 📥 Créer une œuvre
// ─────────────────────────────────────────────────────────────────────────────
export const createOeuvre = async (req, res) => {
  try {
    const oeuvre = new Oeuvre({
      ...req.body,
      ...extractFiles(req.files),
    });
    await oeuvre.save();
    res.status(201).json({ message: "Œuvre créée avec succès.", oeuvre });
  } catch (error) {
    if (handleFileError(error, res)) return;
    console.error("Erreur création:", error);
    res.status(500).json({ message: "Échec de la création de l'œuvre." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✏️  Mettre à jour une œuvre
// ─────────────────────────────────────────────────────────────────────────────
export const updateOeuvre = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body, ...extractFiles(req.files) };

    const updated = await Oeuvre.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Œuvre non trouvée." });

    res.json({ message: "Œuvre mise à jour avec succès.", updated });
  } catch (error) {
    if (handleFileError(error, res)) return;
    console.error("Erreur mise à jour:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 👁️  Basculer la visibilité (masquer / afficher)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleVisibility = async (req, res) => {
  try {
    const oeuvre = await Oeuvre.findById(req.params.id);
    if (!oeuvre) return res.status(404).json({ message: "Œuvre non trouvée." });

    oeuvre.isVisible = !oeuvre.isVisible;
    await oeuvre.save();

    res.json({
      message: oeuvre.isVisible ? "Œuvre maintenant visible." : "Œuvre masquée.",
      isVisible: oeuvre.isVisible,
    });
  } catch (error) {
    console.error("Erreur toggleVisibility:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 📤 Récupérer toutes les œuvres
//    - Admin / chef pupitre : toutes (visibles + masquées)
//    - Choriste             : seulement isVisible = true
// ─────────────────────────────────────────────────────────────────────────────
export const getOeuvres = async (req, res) => {
  try {
    // req.user est injecté par loggedMiddleware
    const isPrivileged = req.user?.role === "admin" || req.user?.role === "chefPupitre";
    const filter = isPrivileged ? {} : { isVisible: true };

    const oeuvres = await Oeuvre.find(filter).sort({ createdAt: -1 });
    res.json(oeuvres);
  } catch (error) {
    console.error("Erreur récupération:", error);
    res.status(500).json({ message: "Erreur lors de la récupération." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 Récupérer une œuvre par ID
// ─────────────────────────────────────────────────────────────────────────────
export const getOeuvreById = async (req, res) => {
  try {
    const oeuvre = await Oeuvre.findById(req.params.id);
    if (!oeuvre) return res.status(404).json({ message: "Œuvre non trouvée." });

    // Un choriste ne peut pas accéder à une œuvre masquée
    const isPrivileged = req.user?.role === "admin" || req.user?.role === "chefPupitre";
    if (!oeuvre.isVisible && !isPrivileged) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    res.status(200).json(oeuvre);
  } catch (error) {
    console.error("Erreur récupération œuvre:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️  Supprimer définitivement une œuvre
// ─────────────────────────────────────────────────────────────────────────────
export const deleteOeuvrePermanent = async (req, res) => {
  try {
    const deleted = await Oeuvre.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Œuvre non trouvée." });
    res.json({ message: "Œuvre supprimée définitivement." });
  } catch (error) {
    console.error("Erreur suppression:", error);
    res.status(500).json({ message: "Échec de la suppression." });
  }
};