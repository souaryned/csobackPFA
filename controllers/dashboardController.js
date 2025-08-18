// controllers/dashboardController.js

import User from "../models/userModel.js";
import Concert from "../models/concertModel.js";
import Repetition from "../models/repetitionModel.js";
import Oeuvre from "../models/oeuvreModel.js";
import Leave from "../models/recordModel.js";

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
    // ✅ SIMPLIFIED: Get only essential leave requests data
    
    // 1) Count pending leave requests (for manager to review)
    const leaveRequestsCount = await Leave.countDocuments({
      status: 'pending'
    });

    // 2) Count all leave requests
    const totalLeaveRequests = await Leave.countDocuments();

    // 3) Count approved leave requests
    const approvedLeaveRequests = await Leave.countDocuments({
      status: 'approved'
    });

    // ✅ REMOVED: rejectedLeaveRequests and recentLeaveRequests

    // 4) Get actual pending leave requests with user details for the table
    const pendingLeaveRequestsDetails = await Leave.find({ 
      status: 'pending' 
    })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 }) // Most recent first
    .limit(50); // Limit to latest 50 requests

    // 5) Get all leave requests for comprehensive table (optional)
    const allLeaveRequestsDetails = await Leave.find()
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(100); // Limit to latest 100 requests

    // 6) Choristes actifs (existing logic)
    const excludedStatuses = ['Inactif', 'En congé', 'éliminé'];
    const activeChoristesCount = await User.countDocuments({
      role: 'choriste',
      status: { $nin: excludedStatuses },
    });

    return res.json({
      // ✅ SIMPLIFIED: Leave statistics (removed rejected and recent)
      leaveRequestsCount,        // Pending requests
      totalLeaveRequests,        // All requests
      approvedLeaveRequests,     // Approved requests
      
      // ✅ Leave data for tables
      pendingLeaveRequestsDetails,
      allLeaveRequestsDetails,
      
      // ✅ Other data
      activeChoristesCount,
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load manager dashboard data' });
  }
};

export const getChoristeDashboard = async (req, res) => {
  try {
    const userId = req.auth.userId; // Current logged choriste

    // 1) Get all concerts where this choriste participated (was in availableChoristes or finalParticipants)
    const concertsParticipated = await Concert.find({
      $or: [
        { availableChoristes: { $in: [userId] } },
        { finalParticipants: { $in: [userId] } }
      ]
    })
    .populate({
      path: 'programme',
      select: 'title composers genre year' // Only get needed fields from oeuvre
    })
    .sort({ dateHeure: -1 }); // Most recent first

    // 2) Get all repetitions where this choriste was present
    const repetitionsAttended = await Repetition.find({
      presentChoristes: { $in: [userId] }
    })
    .populate('concert', 'title dateHeure location')
    .sort({ date: -1 });

    // 3) Calculate basic statistics (only what client requested)
    const totalConcerts = concertsParticipated.length;
    const totalRepetitions = repetitionsAttended.length;

    // 4) Get all unique œuvres from participated concerts for filtering
    const allOeuvres = [];
    concertsParticipated.forEach(concert => {
      if (concert.programme && concert.programme.length > 0) {
        concert.programme.forEach(oeuvre => {
          if (oeuvre && !allOeuvres.find(o => o._id.toString() === oeuvre._id.toString())) {
            allOeuvres.push({
              _id: oeuvre._id,
              title: oeuvre.title,
              composers: oeuvre.composers,
              genre: oeuvre.genre
            });
          }
        });
      }
    });

    // 5) Get available years for date filtering
    const availableYears = [...new Set(
      concertsParticipated.map(concert => new Date(concert.dateHeure).getFullYear())
    )].sort((a, b) => b - a);

    return res.json({
      statistics: {
        totalConcerts,
        totalRepetitions
      },
      concertsParticipated,
      repetitionsAttended,
      availableOeuvres: allOeuvres,
      availableYears,
      currentYear: new Date().getFullYear()
    });

  } catch (error) {
    console.error('Choriste dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load choriste dashboard data' });
  }
};


export const getChefDeChoeurDashboard = async (req, res) => {
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
    console.error("Chef de Chœur dashboard error:", error);
    return res.status(500).json({ message: "Failed to load Chef de Chœur dashboard data" });
  }
};