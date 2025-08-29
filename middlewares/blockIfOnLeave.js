import User from "../models/userModel.js";
import Leave from "../models/recordModel.js";

export const blockIfOnLeave = async (req, res, next) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    if (user.status !== "En congé") {
      return next();
    }

    // Récupérer le congé approuvé le plus récent
    const leave = await Leave.findOne({ user: userId, status: "approved" }).sort({ endDate: -1 });
    
    if (!leave) {
      // No approved leave found - restore status
      user.status = user.previousStatus || "Inactif";
      user.previousStatus = null;
      await user.save();
      return next();
    }

    // ✅ FIXED: Proper date handling
    const now = new Date(); // Current UTC time: 2025-08-28 12:06:29
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Start of today

    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    
    leaveStart.setHours(0, 0, 0, 0);   // Start of leave day
    leaveEnd.setHours(23, 59, 59, 999); // End of leave day


    if (today >= leaveStart && today <= leaveEnd) {
      // Congé toujours en cours : bloquer
      return res.status(403).json({ 
        message: "Vous êtes en congé",
        leaveEndDate: leave.endDate,
        currentDate: now.toISOString()
      });
    } else {
      // Leave has ended - restore status
      user.status = user.previousStatus || "Inactif";
      user.previousStatus = null;
      await user.save();
      return next();
    }

  } catch (error) {
    console.error("❌ Error in blockIfOnLeave middleware:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};