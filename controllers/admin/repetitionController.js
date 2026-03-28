import Repetition from "../../models/repetitionModel.js";
import User from "../../models/userModel.js";
import Config from "../../models/configModel.js";
import Concert from "../../models/concertModel.js";
import {
  createManagerModificationTemplate
} from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { sendPushNotification } from '../../tools/push/fcmService.js';
export const createRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime, pupitres } = req.body;

    // 1) Time validation
    if (startTime && endTime && date) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startHour, startMin, 0, 0);

      let end = new Date(date);
      end.setHours(endHour, endMin, 0, 0);

      // If end is not strictly after start, roll into next day
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      // Still not after start → error
      if (end <= start) {
        return res.status(400).json({
          message: "End time must be after start time.",
        });
      }
    }

    // ✅ 2) NEW: Validate pupitres selection
    if (!pupitres || !Array.isArray(pupitres) || pupitres.length === 0) {
      return res.status(400).json({
        message: "At least one voice part (pupitre) must be selected.",
      });
    }

    // Validate each pupitre is valid
    const validPupitres = ["soprano", "alto", "ténor", "basse"];
    const invalidPupitres = pupitres.filter(p => !validPupitres.includes(p));
    if (invalidPupitres.length > 0) {
      return res.status(400).json({
        message: `Invalid voice parts: ${invalidPupitres.join(', ')}`,
      });
    }

    // Remove duplicates from pupitres array
    const uniquePupitres = [...new Set(pupitres)];

    // ✅ 3) UPDATED: Smart duplicate prevention
    const existingReps = await Repetition.find({ date });

    // Check for conflicts with existing repetitions
    const hasConflictOnDate = existingReps.some((rep) => {
      if (!Array.isArray(rep.pupitres)) return false;
      
      // Check if there's any overlap in pupitres
      return uniquePupitres.some(p => rep.pupitres.includes(p));
    });

    if (hasConflictOnDate) {
      return res.status(409).json({
        message: "A rehearsal with overlapping voice parts already exists on this date. Each voice part can only have one rehearsal per day.",
      });
    }

    // ✅ 4) Create with selected pupitres
    const repetition = new Repetition({
      ...req.body,
      pupitres: uniquePupitres
    });

    await repetition.save();

    // ✅ RÉPONSE IMMÉDIATE
    res.status(201).json({ 
      message: "Rehearsal created successfully.",
      repetition: {
        _id: repetition._id,
        pupitres: repetition.pupitres
      }
    });

    // ✅ NOTIFICATION PUSH EN ARRIÈRE-PLAN
    setImmediate(async () => {
      try {
        // Récupérer les choristes concernés par les pupitres
        const choristes = await User.find({
          role: 'choriste',
          isLocked: false,
          pupitre: { $in: uniquePupitres },
          fcmToken: { $ne: null },
        }).select('fcmToken');

        const tokens = choristes.map(c => c.fcmToken);

        if (tokens.length === 0) {
          console.log('[FCM] Aucun choriste avec token pour cette répétition');
          return;
        }

        // Formater la date en français
        const dateObj = new Date(repetition.date);
        const dateStr = dateObj.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        await sendPushNotification({
          tokens,
          title: '🎵 Nouvelle répétition programmée',
          body: `${dateStr} de ${repetition.startTime} à ${repetition.endTime} — ${repetition.location}`,
          data: {
            type: 'new_repetition',
            repetitionId: repetition._id.toString(),
          },
        });

        console.log(`[FCM] Notif envoyée à ${tokens.length} choriste(s)`);
      } catch (e) {
        console.error('[FCM] Erreur notif création répétition:', e);
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating rehearsal." });
  }

};

// ✅ UPDATED: updateRepetition function
export const updateRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime, pupitres } = req.body;

    // 1) Time validation
    if (startTime && endTime && date) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      let end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      if (end <= start) {
        return res.status(400).json({ 
          message: "L'heure de fin doit être après l'heure de début." 
        });
      }
    }

    // ✅ 2) NEW: Validate pupitres selection
    if (!pupitres || !Array.isArray(pupitres) || pupitres.length === 0) {
      return res.status(400).json({
        message: "At least one voice part (pupitre) must be selected.",
      });
    }

    // Validate each pupitre is valid
    const validPupitres = ["soprano", "alto", "ténor", "basse"];
    const invalidPupitres = pupitres.filter(p => !validPupitres.includes(p));
    if (invalidPupitres.length > 0) {
      return res.status(400).json({
        message: `Invalid voice parts: ${invalidPupitres.join(', ')}`,
      });
    }

    // Remove duplicates from pupitres array
    const uniquePupitres = [...new Set(pupitres)];

    // ✅ 3) UPDATED: Check for conflicts (excluding current repetition)
    const existingReps = await Repetition.find({ 
      date,
      _id: { $ne: req.params.id }
    });

    const hasConflictOnDate = existingReps.some((rep) => {
      if (!Array.isArray(rep.pupitres)) return false;
      
      // Check if there's any overlap in pupitres
      return uniquePupitres.some(p => rep.pupitres.includes(p));
    });

    if (hasConflictOnDate) {
      return res.status(409).json({
        message: "A rehearsal with overlapping voice parts already exists on this date. Each voice part can only have one rehearsal per day.",
      });
    }

    // ✅ 4) Update with selected pupitres
    const updated = await Repetition.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        pupitres: uniquePupitres
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    res.json({ 
      message: "Répétition mise à jour avec succès.", 
      updated: {
        _id: updated._id,
        pupitres: updated.pupitres
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur mise à jour." });
  }
};

// ✅ UPDATED: Filter repetitions by user's pupitre
export const getRepetitions = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    // Get user's role and pupitre
    const user = await User.findById(userId).select('role pupitre isChefDePupitre');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    let repetitionQuery = {};

    // Role-based filtering
    if (user.role === 'manager' || user.role === 'admin' || user.role === 'chef de choeur') {
      // Managers, admins, and chef de choeur can see ALL repetitions
      repetitionQuery = {};
    } else if (user.role === 'choriste') {
      if (!user.pupitre) {
        return res.status(400).json({ message: 'Pupitre non défini pour ce choriste.' });
      }
      
      // Both chefs and regular choristes filter by pupitre
      repetitionQuery = {
        pupitres: { $in: [user.pupitre] }
      };
    } else {
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }

    const repetitions = await Repetition.find(repetitionQuery)
      .populate('concert', 'title')
      .populate('presentChoristes', 'firstName lastName pupitre')
      .populate('absentChoristes.choriste', 'firstName lastName pupitre')
      .populate('manualPresences.choriste', 'firstName lastName pupitre')
      .populate('manualPresences.addedBy', 'firstName lastName')
      .populate({
        path: 'managerModifications.manager',
        select: 'firstName lastName',
        options: { strictPopulate: false }
      })
      .sort({ date: 1 });

    res.json(repetitions);
  } catch (error) {
    console.error('Error getting repetitions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des répétitions.' });
  }
};

export const deleteRepetitionPermanent = async (req, res) => {
  try {
    await Repetition.findByIdAndDelete(req.params.id);
    res.json({ message: "Répétition supprimée définitivement." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression." });
  }
};

export const getAttendanceForConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    // 1) Load threshold from config
    const config = await Config.findOne();
    const threshold = config ? config.participationThreshold : 70;

    // 2) Get all repetitions for this concert
    const repetitions = await Repetition.find({ concert: concertId });
    if (!repetitions.length) {
      return res.status(404).json({ 
        message: "Aucune répétition trouvée pour ce concert." 
      });
    }

    // 3) Get active choristes
    const choristes = await User.find({
      role: "choriste",
      isChoristeLocked: { $ne: true },
    });

    // 4) Calculate participation rate for each choriste
    const participation = choristes.map((choriste) => {
      let totalRepsForChoriste = 0;
      let attendedReps = 0;

      repetitions.forEach((rep) => {
        // ✅ UPDATED: Check if choriste's pupitre is included in this repetition
        if (rep.pupitres.includes(choriste.pupitre)) {
          totalRepsForChoriste++;
          
          // Check if choriste attended this repetition
          const isPresent = rep.presentChoristes.some(p => 
            p.toString() === choriste._id.toString()
          );
          
          const manualPresence = rep.manualPresences.find(m => 
            m.choriste.toString() === choriste._id.toString() && m.type === 'present'
          );
          
          if (isPresent || manualPresence) {
            attendedReps++;
          }
        }
      });

      const attendanceRate = totalRepsForChoriste > 0 
        ? Math.round((attendedReps / totalRepsForChoriste) * 100) 
        : 100; // ✅ If no repetitions for this pupitre, consider eligible

      return {
        choristeId: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        email: choriste.email,
        pupitre: choriste.pupitre,
        totalRepetitions: totalRepsForChoriste,
        attendedRepetitions: attendedReps,
        attendanceRate,
      };
    });

    // 5) Filter out choristes with no repetitions for their pupitre
    const relevantParticipation = participation.filter(p => p.totalRepetitions > 0);

    res.json({
      threshold,
      participation: relevantParticipation,
      totalRepetitions: repetitions.length,
      stats: {
        totalChoristes: relevantParticipation.length,
        avgAttendanceRate: relevantParticipation.length > 0 
          ? Math.round(relevantParticipation.reduce((sum, p) => sum + p.attendanceRate, 0) / relevantParticipation.length)
          : 0,
        // ✅ ADD: Breakdown by pupitre
        pupitreBreakdown: ['soprano', 'alto', 'ténor', 'basse'].map(pupitre => {
          const pupitreParticipation = relevantParticipation.filter(p => p.pupitre === pupitre);
          const pupitreRepetitions = repetitions.filter(rep => rep.pupitres.includes(pupitre));
          return {
            pupitre,
            choristes: pupitreParticipation.length,
            repetitions: pupitreRepetitions.length,
            avgAttendance: pupitreParticipation.length > 0 
              ? Math.round(pupitreParticipation.reduce((sum, p) => sum + p.attendanceRate, 0) / pupitreParticipation.length)
              : 0
          };
        })
      }
    });
  } catch (error) {
    console.error("Erreur calcul taux de participation:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getRepetitionsByConcert = async (req, res) => {
  try {
    const { concertId } = req.params;
    const repetitions = await Repetition.find({ concert: concertId });
    res.status(200).json(repetitions);
  } catch (error) {
    console.error("Erreur récupération répétitions:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const markRepetitionPresence = async (req, res) => {
  const choristeId = req.auth.userId;
  const repetitionId = req.params.id;

  try {
    const repetition = await Repetition.findById(repetitionId);

    if (!choristeId) {
      return res.status(400).json({ message: "ID choriste manquant." });
    }

    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    // ✅ REMOVED: Pupitre validation (now handled by filtering)
    // Frontend will only show relevant repetitions

    // ✅ ALWAYS remove from absent list first
    repetition.absentChoristes = repetition.absentChoristes.filter(
      (a) => a.choriste.toString() !== choristeId
    );

    // ✅ Add to present list only if not already there
    if (!repetition.presentChoristes.includes(choristeId)) {
      repetition.presentChoristes.push(choristeId);
    }

    await repetition.save();

    res.json({ message: "Présence enregistrée avec succès." });
  } catch (err) {
    console.error("markRepetitionPresence error:", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
};

export const markRepetitionAbsence = async (req, res) => {
  const choristeId = req.auth.userId;
  const repetitionId = req.params.id;
  const { reason } = req.body;

  try {
    const repetition = await Repetition.findById(repetitionId);

    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: "Le motif d'absence est requis." });
    }

    // ✅ REMOVED: Pupitre validation (now handled by filtering)

    // Remove from present list if exists
    repetition.presentChoristes = repetition.presentChoristes.filter(
      (p) => p.toString() !== choristeId
    );

    // Check if already absent
    const alreadyAbsent = repetition.absentChoristes.some(
      (a) => a.choriste.toString() === choristeId
    );

    if (!alreadyAbsent) {
      repetition.absentChoristes.push({
        choriste: choristeId,
        reason: reason,
        markedAt: new Date()
      });
    }

    await repetition.save();

    res.json({ message: "Absence enregistrée avec succès." });
  } catch (err) {
    console.error("markRepetitionAbsence error:", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
};

// ✅ Get choristes from chef's pupitre with their status for a specific repetition
export const getMyChoristesStatus = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;


    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }


    // 2. Get repetition with populated data
    const repetition = await Repetition.findById(repetitionId)
      .populate('presentChoristes', 'firstName lastName')
      .populate('absentChoristes.choriste', 'firstName lastName')
      .populate('manualPresences.choriste', 'firstName lastName')
      .populate('manualPresences.addedBy', 'firstName lastName');

    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }


    // ✅ VALIDATE: Check if chef's pupitre is involved in this repetition
    if (!repetition.pupitres.includes(chef.pupitre)) {
      return res.status(403).json({ 
        message: `Cette répétition ne concerne pas votre pupitre (${chef.pupitre}). Pupitres concernés: ${repetition.pupitres.join(', ')}` 
      });
    }


    // 4. Get all choristes from chef's pupitre
    const myPupitreChoristesList = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      isLocked: { $ne: true }
    }).select('firstName lastName email');


    // 5. Build choriste status for each
    const choristesWithStatus = myPupitreChoristesList.map(choriste => {
      const choristeId = choriste._id.toString();

      // Check if present (automatic)
      const isInPresentList = repetition.presentChoristes.some(
        present => present._id.toString() === choristeId
      );

      // Check if absent (automatic)
      const absentRecord = repetition.absentChoristes.find(
        absent => absent.choriste._id.toString() === choristeId
      );

      // Check manual presences
      const manualRecord = repetition.manualPresences.find(
        manual => manual.choriste._id.toString() === choristeId
      );

      let status = 'no-response';
      let isManual = false;
      let manualReason = null;
      let addedBy = null;
      let addedAt = null;
      let automaticReason = null;

      if (manualRecord) {
        // Manual presence/absence takes priority
        status = manualRecord.type; // 'present' or 'absent'
        isManual = true;
        manualReason = manualRecord.reason;
        addedBy = `${manualRecord.addedBy.firstName} ${manualRecord.addedBy.lastName}`;
        addedAt = manualRecord.addedAt;
      } else if (isInPresentList) {
        status = 'present';
        automaticReason = 'Marqué présent automatiquement';
      } else if (absentRecord) {
        status = 'absent';
        automaticReason = absentRecord.reason;
      }

      return {
        _id: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        email: choriste.email,
        status,
        isManual,
        manualReason,
        addedBy,
        addedAt,
        automaticReason
      };
    });

    res.json({
      repetition: {
        _id: repetition._id,
        date: repetition.date,
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location,
        pupitres: repetition.pupitres
      },
      chefPupitre: chef.pupitre,
      choristes: choristesWithStatus
    });

  } catch (error) {
    console.error('❌ Error getting choristes status:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ Add/Update manual presence
export const addManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { choristeId, type, reason } = req.body;

    // Validation
    if (!choristeId || !type || !reason || reason.trim() === '') {
      return res.status(400).json({ 
        message: 'Choriste, type de présence et motif sont requis.' 
      });
    }

    if (!['present', 'absent'].includes(type)) {
      return res.status(400).json({ 
        message: 'Type de présence invalide. Doit être "present" ou "absent".' 
      });
    }

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent modifier les présences.' 
      });
    }

    // 2. Validate choriste belongs to chef's pupitre
    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.role !== 'choriste' || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez gérer que les choristes de votre pupitre.' 
      });
    }

    // 3. Get repetition
    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    // ✅ REMOVED: Pupitre validation (now handled by filtering)

    // 4. Remove from existing automatic arrays
    repetition.presentChoristes = repetition.presentChoristes.filter(id => 
      !id.equals(choristeId)
    );
    repetition.absentChoristes = repetition.absentChoristes.filter(a => 
      !a.choriste.equals(choristeId)
    );

    // 5. Remove existing manual entry for this choriste
    repetition.manualPresences = repetition.manualPresences.filter(m => 
      !m.choriste.equals(choristeId)
    );

    // 6. Add new manual entry
    repetition.manualPresences.push({
      choriste: choristeId,
      addedBy: chefId,
      reason: reason.trim(),
      type
    });

    await repetition.save();

    res.json({ 
      message: `Présence manuelle "${type}" ajoutée pour ${choriste.firstName} ${choriste.lastName}.`,
      action: type,
      choriste: {
        firstName: choriste.firstName,
        lastName: choriste.lastName
      }
    });

  } catch (error) {
    console.error('Error adding manual presence:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ Remove manual presence (revert to automatic)
export const removeManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId, choristeId } = req.params;

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé.' 
      });
    }

    // 2. Validate choriste belongs to chef's pupitre
    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Choriste introuvable dans votre pupitre.' 
      });
    }

    // 3. Remove manual entry
    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    repetition.manualPresences = repetition.manualPresences.filter(m => 
      !m.choriste.equals(choristeId)
    );

    await repetition.save();

    res.json({ 
      message: `Présence manuelle supprimée pour ${choriste.firstName} ${choriste.lastName}. Retour au statut automatique.`
    });

  } catch (error) {
    console.error('Error removing manual presence:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getManagerAbsenceReport = async (req, res) => {
  try {
    const {
      filterType,
      pupitre,
      choristeId,
      date,
      dateFrom,
      dateTo,
      concertId
    } = req.query;

    // Validate filterType
    const validFilterTypes = [
      'general', 'pupitre', 'choriste', 'date', 
      'dateFrom', 'season', 'dateRange', 'programme'
    ];

    if (!filterType || !validFilterTypes.includes(filterType)) {
      return res.status(400).json({ 
        message: 'Type de filtre invalide. Options: ' + validFilterTypes.join(', ')
      });
    }

    // Base query for repetitions
    let repetitionQuery = {};
    let dateFilter = {};

    // Apply date filtering based on filterType
    switch (filterType) {
      case 'date':
        if (!date) {
          return res.status(400).json({ message: 'Date requise pour ce filtre.' });
        }
        dateFilter = {
          date: {
            $gte: new Date(date),
            $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        };
        break;

      case 'dateFrom':
        if (!dateFrom) {
          return res.status(400).json({ message: 'Date de début requise pour ce filtre.' });
        }
        dateFilter = {
          date: { $gte: new Date(dateFrom) }
        };
        break;

      case 'season':
        // Assume season starts September 1st of current academic year
        const now = new Date();
        const currentYear = now.getFullYear();
        const seasonStart = now.getMonth() >= 8 ? // September = month 8
          new Date(currentYear, 8, 1) : // This year's September
          new Date(currentYear - 1, 8, 1); // Last year's September
        
        dateFilter = {
          date: { $gte: seasonStart }
        };
        break;

      case 'dateRange':
        if (!dateFrom || !dateTo) {
          return res.status(400).json({ message: 'Dates de début et fin requises pour ce filtre.' });
        }
        dateFilter = {
          date: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo)
          }
        };
        break;

      case 'programme':
        if (!concertId) {
          return res.status(400).json({ message: 'ID du concert/programme requis pour ce filtre.' });
        }
        repetitionQuery.concert = concertId;
        break;

      // 'general', 'pupitre', 'choriste' don't need date filtering
    }

    // Combine queries
    const finalQuery = { ...repetitionQuery, ...dateFilter };

    // Get repetitions based on query
    const repetitions = await Repetition.find(finalQuery)
      .populate('concert', 'title')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre') // ✅ ADD: pupitre
      .populate('manualPresences.choriste', 'firstName lastName email pupitre') // ✅ ADD: pupitre
      .populate('manualPresences.addedBy', 'firstName lastName')
      .sort({ date: -1 });

    if (!repetitions.length) {
      return res.json({
        filterType,
        filterValue: getFilterValue(req.query),
        period: getPeriodInfo(filterType, req.query),
        statistics: {
          totalRepetitions: 0,
          totalAbsences: 0,
          absenceRate: 0
        },
        absenceRecords: []
      });
    }

    // Build absence records from repetitions
    let allAbsenceRecords = [];

    repetitions.forEach(repetition => {
      // Get automatic absences
      repetition.absentChoristes.forEach(absent => {
        if (absent.choriste) {
          // ✅ CRITICAL: Only include if choriste's pupitre was involved in this repetition
          if (repetition.pupitres.includes(absent.choriste.pupitre)) {
            allAbsenceRecords.push({
              _id: `${repetition._id}_${absent.choriste._id}_auto`,
              choriste: {
                _id: absent.choriste._id,
                firstName: absent.choriste.firstName,
                lastName: absent.choriste.lastName,
                email: absent.choriste.email,
                pupitre: absent.choriste.pupitre
              },
              repetition: {
                _id: repetition._id,
                date: repetition.date,
                startTime: repetition.startTime,
                endTime: repetition.endTime,
                location: repetition.location,
                pupitres: repetition.pupitres, // ✅ ADD: show which pupitres were involved
                concert: repetition.concert
              },
              reason: absent.reason,
              isManual: false,
              addedAt: repetition.createdAt
            });
          }
        }
      });

      // Get manual absences
      repetition.manualPresences
        .filter(manual => manual.type === 'absent')
        .forEach(manual => {
          if (manual.choriste) {
            // ✅ CRITICAL: Only include if choriste's pupitre was involved in this repetition
            if (repetition.pupitres.includes(manual.choriste.pupitre)) {
              allAbsenceRecords.push({
                _id: `${repetition._id}_${manual.choriste._id}_manual`,
                choriste: {
                  _id: manual.choriste._id,
                  firstName: manual.choriste.firstName,
                  lastName: manual.choriste.lastName,
                  email: manual.choriste.email,
                  pupitre: manual.choriste.pupitre
                },
                repetition: {
                  _id: repetition._id,
                  date: repetition.date,
                  startTime: repetition.startTime,
                  endTime: repetition.endTime,
                  location: repetition.location,
                  pupitres: repetition.pupitres, // ✅ ADD: show which pupitres were involved
                  concert: repetition.concert
                },
                reason: manual.reason,
                isManual: true,
                addedBy: `${manual.addedBy.firstName} ${manual.addedBy.lastName}`,
                addedAt: manual.addedAt
              });
            }
          }
        });
    });

    // Apply choriste/pupitre filtering to records
    let filteredRecords = allAbsenceRecords;

    if (filterType === 'pupitre' && pupitre) {
      filteredRecords = allAbsenceRecords.filter(record => 
        record.choriste.pupitre === pupitre
      );
    }

    if (filterType === 'choriste' && choristeId) {
      filteredRecords = allAbsenceRecords.filter(record => 
        record.choriste._id.toString() === choristeId
      );
    }

    // Calculate statistics
    const totalRepetitions = repetitions.length;
    const totalAbsences = filteredRecords.length;
    
    // Get unique choristes for calculating absence rate
    const uniqueChoristesSet = new Set();
    if (filterType === 'choriste' && choristeId) {
      uniqueChoristesSet.add(choristeId);
    } else if (filterType === 'pupitre' && pupitre) {
      const choristesInPupitre = await User.find({ 
        role: 'choriste', 
        pupitre, 
        isLocked: { $ne: true } 
      });
      choristesInPupitre.forEach(c => uniqueChoristesSet.add(c._id.toString()));
    } else {
      const allChoristes = await User.find({ 
        role: 'choriste', 
        isLocked: { $ne: true } 
      });
      allChoristes.forEach(c => uniqueChoristesSet.add(c._id.toString()));
    }

    const totalPossibleAttendances = totalRepetitions * uniqueChoristesSet.size;
    const absenceRate = totalPossibleAttendances > 0 ? 
      ((totalAbsences / totalPossibleAttendances) * 100).toFixed(1) : 0;

    // Find most absent choriste
    const absenceCountByChpriste = {};
    filteredRecords.forEach(record => {
      const key = record.choriste._id.toString();
      absenceCountByChpriste[key] = (absenceCountByChpriste[key] || 0) + 1;
    });

    let mostAbsentChoriste = null;
    if (Object.keys(absenceCountByChpriste).length > 0) {
      const maxAbsences = Math.max(...Object.values(absenceCountByChpriste));
      const mostAbsentId = Object.keys(absenceCountByChpriste).find(
        key => absenceCountByChpriste[key] === maxAbsences
      );
      const mostAbsentRecord = filteredRecords.find(
        r => r.choriste._id.toString() === mostAbsentId
      );
      if (mostAbsentRecord) {
        mostAbsentChoriste = {
          name: `${mostAbsentRecord.choriste.firstName} ${mostAbsentRecord.choriste.lastName}`,
          absences: maxAbsences,
          pupitre: mostAbsentRecord.choriste.pupitre
        };
      }
    }

    // Sort records by date (most recent first)
    filteredRecords.sort((a, b) => new Date(b.repetition.date) - new Date(a.repetition.date));

    res.json({
      filterType,
      filterValue: getFilterValue(req.query),
      period: getPeriodInfo(filterType, req.query),
      statistics: {
        totalRepetitions,
        totalAbsences,
        absenceRate: parseFloat(absenceRate),
        mostAbsentChoriste
      },
      absenceRecords: filteredRecords
    });

  } catch (error) {
    console.error('Error generating absence report:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Helper function to get filter value description
const getFilterValue = (query) => {
  const { filterType, pupitre, choristeId, date, dateFrom, dateTo, concertId } = query;
  
  switch (filterType) {
    case 'general': return 'Tous les choristes';
    case 'pupitre': return pupitre || 'Pupitre non spécifié';
    case 'choriste': return choristeId || 'Choriste non spécifié';
    case 'date': return date || 'Date non spécifiée';
    case 'dateFrom': return `Depuis ${dateFrom || 'date non spécifiée'}`;
    case 'season': return 'Depuis début de saison';
    case 'dateRange': return `Du ${dateFrom || '?'} au ${dateTo || '?'}`;
    case 'programme': return concertId || 'Programme non spécifié';
    default: return 'Filtre inconnu';
  }
};

// Helper function to get period information
const getPeriodInfo = (filterType, query) => {
  const { date, dateFrom, dateTo } = query;
  
  switch (filterType) {
    case 'date':
      return { start: date, end: date, type: 'single-date' };
    case 'dateFrom':
      return { start: dateFrom, end: new Date().toISOString().split('T')[0], type: 'from-date' };
    case 'season':
      const now = new Date();
      const currentYear = now.getFullYear();
      const seasonStart = now.getMonth() >= 8 ? 
        `${currentYear}-09-01` : 
        `${currentYear - 1}-09-01`;
      return { start: seasonStart, end: new Date().toISOString().split('T')[0], type: 'season' };
    case 'dateRange':
      return { start: dateFrom, end: dateTo, type: 'range' };
    default:
      return { start: null, end: null, type: 'all-time' };
  }
};

export const modifyRepetitionForAllChoristes = async (req, res) => {
  try {
    const managerId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { newStartTime, newEndTime, newLocation, urgentMessage, reason } = req.body;

    // 1. Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les managers peuvent modifier les répétitions.' 
      });
    }

    // 2. Get repetition
    const repetition = await Repetition.findById(repetitionId).populate('concert');
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    // 3. ENHANCED BUSINESS HOURS VALIDATION
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const repetitionDate = new Date(repetition.date);
    repetitionDate.setHours(0, 0, 0, 0);

    // Past dates: never modifiable
    if (repetitionDate < today) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition passée. Cette répétition a déjà eu lieu.' 
      });
    }

    // Today: only modifiable before 18:00
    if (repetitionDate.getTime() === today.getTime() && currentHour >= 18) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition d\'aujourd\'hui après 18h00. La période de modification est fermée.' 
      });
    }

    // 4. Validate at least one modification
    if (!newStartTime && !newEndTime && !newLocation && !urgentMessage) {
      return res.status(400).json({ 
        message: 'Au moins une modification est requise.' 
      });
    }

    // 5. REMOVE EXISTING MANAGER MODIFICATION (if any)
    repetition.managerModifications = repetition.managerModifications || [];
    repetition.managerModifications = repetition.managerModifications.filter(mod => 
      mod.manager.toString() !== managerId.toString()
    );

    // 6. ADD NEW MODIFICATION
    const modificationData = {
      manager: managerId,
      modifications: {
        newStartTime: newStartTime || null,
        newEndTime: newEndTime || null,
        newLocation: newLocation || null,
        urgentMessage: urgentMessage || null,
        reason: reason || null
      },
      originalValues: {
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location
      },
      notificationsSent: false,
      modifiedAt: new Date()
    };

    // Add to repetition
    repetition.managerModifications.push(modificationData);
    await repetition.save();

    // Get the just-added modification (last one)
    const savedModification = repetition.managerModifications[repetition.managerModifications.length - 1];

    // 7. SUCCESS RESPONSE FIRST
    res.json({ 
      message: 'Modification enregistrée.',
      modificationId: savedModification._id,
      totalChoristes: 0 // Will be updated after counting
    });

    // 8. ✅ UPDATED: SEND EMAILS TO RELEVANT CHORISTES IN BACKGROUND (async)
    setImmediate(async () => {
      try {
        // ✅ UPDATED: Get only choristes whose pupitres are involved in this repetition
        const relevantChoristesList = await User.find({
          role: 'choriste',
          isLocked: { $ne: true },
          pupitre: { $in: repetition.pupitres } // ✅ Only choristes from involved pupitres
        }).select('firstName lastName email pupitre');

        // Send emails to each relevant choriste
        for (const choriste of relevantChoristesList) {
          const emailData = createManagerModificationTemplate({
            choristeFirstName: choriste.firstName,
            choristeLastName: choriste.lastName,
            choristerPupitre: choriste.pupitre,
            managerName: `${manager.firstName} ${manager.lastName}`,
            repetition,
            modifications: modificationData.modifications,
            originalValues: modificationData.originalValues
          });

          await sendNotification({
            email: choriste.email,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            attachments: emailData.attachments,
          });
        }

        // Mark notifications as sent
        const updatedRepetition = await Repetition.findById(repetitionId);
        const modificationToUpdate = updatedRepetition.managerModifications.id(savedModification._id);
        if (modificationToUpdate) {
          modificationToUpdate.notificationsSent = true;
          await updatedRepetition.save();
        }

      } catch (emailError) {
        console.error('Error sending modification emails:', emailError);
      }
    });

  } catch (error) {
    console.error('Error saving manager modification:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ UPDATED: Filter repetitions for managers (if needed)
export const getRepetitionsForManager = async (req, res) => {
  try {
    const managerId = req.auth.userId;

    // 1. Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les managers peuvent accéder à cette fonctionnalité.' 
      });
    }

    // 2. Get all repetitions (managers can see all)
    const repetitions = await Repetition.find()
      .populate('concert', 'title')
      .populate({
        path: 'managerModifications.manager',
        select: 'firstName lastName'
      })
      .sort({ date: 1 });

    // 3. Add modification status for this manager
    const repetitionsWithModificationStatus = repetitions.map(rep => {
      const repObj = rep.toObject();
      
      const managerModification = rep.managerModifications?.find(mod => {
        const modManagerId = mod.manager._id ? mod.manager._id.toString() : mod.manager.toString();
        return modManagerId === managerId.toString();
      });

      repObj.hasMyModification = !!managerModification;
      repObj.myModification = managerModification || null;

      return repObj;
    });

    res.json({
      repetitions: repetitionsWithModificationStatus,
      managerInfo: {
        name: `${manager.firstName} ${manager.lastName}`
      }
    });

  } catch (error) {
    console.error('Error getting repetitions for manager:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * ✅ UPDATED: Get comprehensive absence report with pupitre-specific repetition data
 */
export const getComprehensiveAbsenceReport = async (req, res) => {
  try {
    const {
      filterType,
      pupitre,
      choristeId,
      date,
      dateFrom,
      dateTo,
      concertId
    } = req.query;

    // Validate filterType
    const validFilterTypes = [
      'general', 'pupitre', 'choriste', 'date', 
      'dateFrom', 'season', 'dateRange', 'programme'
    ];

    if (!filterType || !validFilterTypes.includes(filterType)) {
      return res.status(400).json({ 
        message: 'Type de filtre invalide. Options: ' + validFilterTypes.join(', '),
        received: filterType
      });
    }

    // ✅ FIXED: Build repetition query based on filter
    let repetitionQuery = {};
    let dateFilter = {};
    let concertDateFilter = {};

    // Apply date filtering first
    switch (filterType) {
      case 'date':
        if (!date) {
          return res.status(400).json({ message: 'Date requise pour ce filtre.' });
        }
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        dateFilter = {
          date: {
            $gte: targetDate,
            $lt: nextDay
          }
        };
        concertDateFilter = {
          dateHeure: {
            $gte: targetDate,
            $lt: nextDay
          }
        };
        break;

      case 'dateFrom':
        if (!dateFrom) {
          return res.status(400).json({ message: 'Date de début requise pour ce filtre.' });
        }
        dateFilter = {
          date: { $gte: new Date(dateFrom) }
        };
        concertDateFilter = {
          dateHeure: { $gte: new Date(dateFrom) }
        };
        break;

      case 'season':
        const now = new Date();
        const currentYear = now.getFullYear();
        const seasonStart = now.getMonth() >= 8 ? 
          new Date(currentYear, 8, 1) : 
          new Date(currentYear - 1, 8, 1);
        
        dateFilter = {
          date: { $gte: seasonStart }
        };
        concertDateFilter = {
          dateHeure: { $gte: seasonStart }
        };
        break;

      case 'dateRange':
        if (!dateFrom || !dateTo) {
          return res.status(400).json({ message: 'Dates de début et fin requises pour ce filtre.' });
        }
        dateFilter = {
          date: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo)
          }
        };
        concertDateFilter = {
          dateHeure: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo)
          }
        };
        break;

      case 'programme':
        if (!concertId) {
          return res.status(400).json({ message: 'ID du concert/programme requis pour ce filtre.' });
        }
        repetitionQuery.concert = concertId;
        break;

      // For 'general', 'pupitre', 'choriste' - no date filtering on repetitions
    }

    // Combine queries
    const finalQuery = { ...repetitionQuery, ...dateFilter };

    // ✅ NEW: Check if data exists for date-based filters
    if (Object.keys(dateFilter).length > 0) {
      // Check repetitions for this date range
      const repetitionsCount = await Repetition.countDocuments(finalQuery);
      
      // Check concerts for this date range
      const concertsCount = await Concert.countDocuments(concertDateFilter);
      
      // If no repetitions AND no concerts for this date range
      if (repetitionsCount === 0 && concertsCount === 0) {
        return res.json({
          filterType,
          filterValue: getFilterValue(req.query),
          period: getPeriodInfo(filterType, req.query),
          message: 'Aucune répétition ou concert trouvé pour cette période.',
          noDataFound: true,
          statistics: { 
            totalChoristes: 0, 
            totalRepetitions: 0, 
            totalConcerts: 0, 
            threshold: 70
          },
          choristesData: []
        });
      }
    }

    // Get repetitions based on query
    const repetitions = await Repetition.find(finalQuery)
      .populate('concert', 'title dateHeure')
      .populate('presentChoristes', 'firstName lastName email pupitre')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.addedBy', 'firstName lastName')
      .sort({ date: -1 });

    // Get all concerts (for concert attendance calculation)
    let concertQuery = {};
    if (Object.keys(concertDateFilter).length > 0) {
      concertQuery = concertDateFilter;
    }

    // ✅ FIXED: Get concerts with finalParticipants for validation check
    const concerts = await Concert.find(concertQuery)
      .populate('availableChoristes', '_id')
      .populate('finalParticipants', '_id') // ✅ CRITICAL: Need finalParticipants for validation check
      .populate('absentChoristes.choriste', '_id firstName lastName email pupitre')
      .sort({ dateHeure: -1 });

    // Get config for threshold
    const config = await Config.findOne();
    const threshold = config?.participationThreshold ?? 70;

    // ✅ FIXED: Build choristes query based on filter type
    let choristesQuery = { 
      role: 'choriste', 
      isLocked: { $ne: true },
      status: { $nin: ['Inactif', 'En congé', 'éliminé'] }
    };

    // Apply WHO filters to choristes query
    if (filterType === 'pupitre' && pupitre) {
      choristesQuery.pupitre = pupitre;
    }

    if (filterType === 'choriste' && choristeId) {
      choristesQuery._id = choristeId;
    }

    const choristes = await User.find(choristesQuery)
      .select('firstName lastName email pupitre eliminationRecords')
      .sort({ firstName: 1, lastName: 1 });

    if (!choristes.length) {
      return res.json({
        filterType,
        filterValue: getFilterValue(req.query),
        period: getPeriodInfo(filterType, req.query),
        statistics: {
          totalChoristes: 0,
          totalRepetitions: repetitions.length,
          totalConcerts: concerts.length,
          threshold
        },
        choristesData: []
      });
    }

    // Calculate data for each choriste
    const choristesData = choristes.map(choriste => {
      // ===== ✅ UPDATED: REPETITION ATTENDANCE CALCULATION (PUPITRE-SPECIFIC) =====
      // ✅ CRITICAL: Only count repetitions where this choriste's pupitre was involved
      const relevantRepetitions = repetitions.filter(rep => 
        rep.pupitres.includes(choriste.pupitre)
      );

      const totalRepetitions = relevantRepetitions.length;
      let attendedRepetitions = 0;
      let repetitionAbsences = [];

      relevantRepetitions.forEach(repetition => {
        let isPresent = false;
        let absenceReason = null;

        // Check in presentChoristes
        if (repetition.presentChoristes.some(
          present => present._id.toString() === choriste._id.toString()
        )) {
          isPresent = true;
        }

        // Check automatic absences
        const autoAbsent = repetition.absentChoristes.find(
          absent => absent.choriste._id.toString() === choriste._id.toString()
        );
        if (autoAbsent) {
          isPresent = false;
          absenceReason = autoAbsent.reason;
        }

        // Check manual presences (overrides automatic)
        const manualPresence = repetition.manualPresences.find(
          manual => manual.choriste._id.toString() === choriste._id.toString()
        );
        if (manualPresence) {
          isPresent = manualPresence.type === 'present';
          if (!isPresent) {
            absenceReason = manualPresence.reason;
          }
        }

        if (isPresent) {
          attendedRepetitions++;
        } else {
          // Add to absence list
          repetitionAbsences.push({
            repetitionId: repetition._id,
            date: repetition.date,
            location: repetition.location,
            concertTitle: repetition.concert?.title || 'Concert non défini',
            pupitres: repetition.pupitres, // ✅ ADD: show which pupitres were involved
            reason: absenceReason || 'Non marqué présent',
            isManual: !!manualPresence
          });
        }
      });

      const repetitionAttendanceRate = totalRepetitions > 0 
        ? (attendedRepetitions / totalRepetitions) * 100 
        : 100; // ✅ If no repetitions for this pupitre, consider eligible

      // ===== ✅ FIXED: CONCERT VALIDATION-BASED CALCULATION =====
      const totalConcerts = concerts.length;
      let validatedConcerts = 0; // ✅ CHANGED: Count only validated concerts
      let concertAbsences = [];

      concerts.forEach(concert => {
        // ✅ FIXED: Check if choriste is in finalParticipants (validated)
        const isValidated = concert.finalParticipants.some(
          participant => participant._id.toString() === choriste._id.toString()
        );

        const hasMarkedAvailability = concert.availableChoristes.some(
          ac => ac._id.toString() === choriste._id.toString()
        );

        const absentRecord = concert.absentChoristes.find(
          absent => absent.choriste._id.toString() === choriste._id.toString()
        );

        const isEliminated = choriste.eliminationRecords?.some(
          record => record.concertId?.toString() === concert._id.toString()
        );

        // ✅ FIXED: Only count if validated (in finalParticipants)
        if (isValidated && !isEliminated) {
          validatedConcerts++;
        } else {
          // Add to concert absences with proper reason
          let absenceReason = 'N\'a pas marqué sa disponibilité';
          
          if (isEliminated) {
            absenceReason = 'Éliminé';
          } else if (absentRecord) {
            absenceReason = getAbsenceReasonMessage(absentRecord.reason);
          } else if (hasMarkedAvailability && !isValidated) {
            absenceReason = 'Disponible mais non validé'; // ✅ NEW: Specific reason for available but not validated
          }

          concertAbsences.push({
            concertId: concert._id,
            title: concert.title,
            dateHeure: concert.dateHeure,
            reason: absenceReason,
            markedAt: absentRecord?.markedAt || null
          });
        }
      });

      // ✅ FIXED: Use validatedConcerts instead of availableConcerts
      const concertAttendanceRate = totalConcerts > 0 
        ? (validatedConcerts / totalConcerts) * 100 
        : 0;

      return {
        choriste: {
          _id: choriste._id,
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          email: choriste.email,
          pupitre: choriste.pupitre
        },
        // ✅ UPDATED: Repetition data now pupitre-specific
        repetitionStats: {
          totalRepetitions, // ✅ Now pupitre-specific
          attendedRepetitions,
          attendanceRate: Math.round(repetitionAttendanceRate * 10) / 10,
          absencesCount: totalRepetitions - attendedRepetitions,
          // ✅ NEW: Add context about filtering
          allRepetitionsCount: repetitions.length,
          pupitreSpecificNote: totalRepetitions < repetitions.length 
            ? `Seules les ${totalRepetitions} répétitions concernant votre pupitre (${choriste.pupitre}) sont prises en compte.`
            : null
        },
        // ✅ FIXED: Concert data now based on validation
        concertStats: {
          totalConcerts,
          availableConcerts: validatedConcerts, // ✅ RENAMED but using validated count
          attendanceRate: Math.round(concertAttendanceRate * 10) / 10,
          absencesCount: totalConcerts - validatedConcerts // ✅ FIXED: Use validated count
        },
        // Detailed absence lists
        repetitionAbsences,
        concertAbsences,
        // Overall performance
        overallAttendanceRate: Math.round(((repetitionAttendanceRate + concertAttendanceRate) / 2) * 10) / 10,
        isAtRisk: repetitionAttendanceRate < threshold || concertAttendanceRate < threshold
      };
    });

    // Sort by overall performance (combination of both rates)
    choristesData.sort((a, b) => {
      const aOverall = (a.repetitionStats.attendanceRate + a.concertStats.attendanceRate) / 2;
      const bOverall = (b.repetitionStats.attendanceRate + b.concertStats.attendanceRate) / 2;
      return aOverall - bOverall; // Lowest first (most problematic)
    });

    // Calculate summary statistics
    const totalRepetitionAbsences = choristesData.reduce(
      (sum, c) => sum + c.repetitionStats.absencesCount, 0
    );
    const totalConcertAbsences = choristesData.reduce(
      (sum, c) => sum + c.concertStats.absencesCount, 0
    );

    const avgRepetitionRate = choristesData.length > 0 
      ? choristesData.reduce((sum, c) => sum + c.repetitionStats.attendanceRate, 0) / choristesData.length
      : 0;

    const avgConcertRate = choristesData.length > 0 
      ? choristesData.reduce((sum, c) => sum + c.concertStats.attendanceRate, 0) / choristesData.length
      : 0;

    const atRiskCount = choristesData.filter(c => c.isAtRisk).length;

    res.json({
      filterType,
      filterValue: getFilterValue(req.query),
      period: getPeriodInfo(filterType, req.query),
      statistics: {
        totalChoristes: choristes.length,
        totalRepetitions: repetitions.length,
                totalConcerts: concerts.length,
        totalRepetitionAbsences,
        totalConcertAbsences,
        avgRepetitionAttendanceRate: Math.round(avgRepetitionRate * 10) / 10,
        avgConcertAttendanceRate: Math.round(avgConcertRate * 10) / 10,
        atRiskCount,
        threshold
      },
      choristesData
    });

  } catch (error) {
    console.error('Error generating comprehensive absence report:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Helper function for absence reason messages (reuse from concert controller)
const getAbsenceReasonMessage = (reason) => {
  switch (reason) {
    case 'did_not_mark_disponibilite':
      return 'N\'a pas marqué sa disponibilité';
    case 'removed_by_admin':
      return 'Retiré par admin';
    case 'removed_by_chef':
      return 'Retiré par chef de pupitre';
    case 'manual_absence':
      return 'Absence manuelle';
    default:
      return 'Absent';
  }
};