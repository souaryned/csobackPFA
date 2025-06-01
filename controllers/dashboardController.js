// controllers/dashboardController.js

import User from "../models/userModel.js";
import Concert from "../models/concertModel.js";
import Repetition from "../models/repetitionModel.js";

// Helpers pour filtrer date passée / à venir
const isPast = (date) => new Date(date) < new Date();
const isUpcoming = (date) => new Date(date) >= new Date();

export const getAdminDashboard = async (req, res) => {
  try {
    // 1) Requête directe sur Concert
    const concerts = await Concert.find().populate("programme");
    const pastConcerts = concerts.filter((c) => isPast(c.dateHeure));
    const upcomingConcerts = concerts.filter((c) => isUpcoming(c.dateHeure));

    // 2) Requête directe sur User (tous les utilisateurs non verrouillés et non-admins)
    const users = await User.find({ isLocked: { $ne: true }, role: { $nin: ["admin"] } });
    const countByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    // 3) Choristes verrouillés (éliminations)
    const lockedUsers = await User.find({ isLocked: true });
    const eliminationCount = lockedUsers.length;

    // 4) Requête directe sur Repetition
    const repetitions = await Repetition.find().populate("concert");
    const pastRepetitions = repetitions.filter((r) => isPast(r.date));
    const upcomingRepetitions = repetitions.filter((r) => isUpcoming(r.date));

    // 5) Candidatures en attente (« Pending »)
    const membershipSubmissions = await User.find({ role: "choriste", memberstatus: "Pending" });

    // 6) Choristes acceptés
    const acceptedChoristes = await User.find({ role: "choriste", memberstatus: "Accepted" });

    // 7) Choristes actifs (hors « Inactif », « En congé », « éliminé »)
    const excludedStatuses = ["Inactif", "En congé", "éliminé"];
    const activeChoristes = await User.find({
      role: "choriste",
      status: { $nin: excludedStatuses },
    });

    return res.json({
      concerts: {
        past: pastConcerts.length,
        upcoming: upcomingConcerts.length,
      },
      usersByRole: countByRole,
      eliminationCount,
      repetitions: {
        past: pastRepetitions.length,
        upcoming: upcomingRepetitions.length,
      },
      membershipSubmissionsCount: membershipSubmissions.length,
      acceptedMembershipsCount: acceptedChoristes.length,
      activeChoristesCount: activeChoristes.length,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ message: "Failed to load admin dashboard data" });
  }
};

export const getManagerDashboard = async (req, res) => {
  try {
    // 1) Comptage simplifié des demandes de congé (exemple : 0 si aucun modèle de leave n'existe encore)
    const leaveRequestsCount = 0;

    // 2) Choristes actifs (hors « Inactif », « En congé », « éliminé »)
    const excludedStatuses = ['Inactif', 'En congé', 'éliminé'];
    const activeChoristesCount = await User.countDocuments({
      role: 'choriste',
      status: { $nin: excludedStatuses },
      // isLocked: { $ne: true }, // optionnel : si on souhaite exclure les utilisateurs verrouillés
    });

    return res.json({
      leaveRequestsCount,
      activeChoristesCount,
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load manager dashboard data' });
  }
};

// export const getChoristeChefDashboard = (req, res) => {
//   // lire req.auth.role (pas req.user.role)
//   return res.json({
//     message: `Hello ${req.auth.role}, Welcome to CSO platform 👋`,
//   });
// };
