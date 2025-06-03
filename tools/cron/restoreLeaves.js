// restoreLeaves.js
import User from "../../models/userModel.js";
import Leave from "../../models/recordModel.js";

export async function restoreExpiredLeaves() {
  const now = new Date();
  // 1) Trouver tous les utilisateurs dont status === "En congé"
  const usersOnLeave = await User.find({ status: "En congé" });

  for (const user of usersOnLeave) {
    // 2) Récupérer leur congé le plus récent
    const leave = await Leave
      .findOne({ user: user._id, status: "approved" })
      .sort({ endDate: -1 });

    if (leave && leave.endDate < now) {
      // 3) La date de fin est passée → restaurer l’ancien statut
      user.status = user.previousStatus || "Inactif";
      user.previousStatus = null;
      await user.save();
    }
  }
}
