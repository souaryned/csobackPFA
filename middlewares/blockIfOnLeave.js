import User from "../models/userModel.js";
import Leave from "../models/recordModel.js";

export const blockIfOnLeave = async (req, res, next) => {
const userId = req.auth.userId;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

  if (user.status !== "En congé") {
    return next();
  }

  // Récupérer le congé approuvé le plus récent
  const leave = await Leave.findOne({ user: userId, status: "approved" }).sort({ endDate: -1 });
  const now = new Date();

  if (!leave || leave.endDate < now) {
    // Congé terminé : restaurer le statut
    user.status = user.previousStatus || "Inactif";
    user.previousStatus = null;
    await user.save();
    return next();
  }

  // Congé toujours en cours : bloquer
  return res.status(403).json({ message: "Vous êtes en congé, action interdite." });
};
