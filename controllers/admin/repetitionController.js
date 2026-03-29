import Repetition from "../../models/repetitionModel.js";
import User from "../../models/userModel.js";
import Config from "../../models/configModel.js";
import Concert from "../../models/concertModel.js";
import {
  createManagerModificationTemplate
} from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { sendPushNotification } from '../../tools/push/fcmService.js';

// ─────────────────────────────────────────────
// HELPER: check if "now" falls inside the repetition window
// Returns { allowed: bool, reason?: string }
// ─────────────────────────────────────────────
const isInsideRepetitionWindow = (repetition) => {
  const now = new Date();

  // Parse the repetition date (strip time part)
  const repDate = new Date(repetition.date);
  const repDateOnly = new Date(repDate.getFullYear(), repDate.getMonth(), repDate.getDate());
  const todayOnly   = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());

  // Must be the same calendar day
  if (repDateOnly.getTime() !== todayOnly.getTime()) {
    const isPast = repDateOnly < todayOnly;
    return {
      allowed: false,
      reason: isPast
        ? "Cette répétition est déjà passée."
        : "Cette répétition n'a pas encore commencé."
    };
  }

  // Parse startTime / endTime (format "HH:MM")
  const [startH, startM] = repetition.startTime.split(':').map(Number);
  const [endH,   endM]   = repetition.endTime.split(':').map(Number);

  const windowStart = new Date(repDate.getFullYear(), repDate.getMonth(), repDate.getDate(), startH, startM, 0);
  let   windowEnd   = new Date(repDate.getFullYear(), repDate.getMonth(), repDate.getDate(), endH,   endM,   0);

  // Handles overnight repetitions (e.g. 23:00 → 01:00)
  if (windowEnd <= windowStart) windowEnd.setDate(windowEnd.getDate() + 1);

  if (now < windowStart) {
    return {
      allowed: false,
      reason: `La répétition commence à ${repetition.startTime}. Vous pourrez pointer votre présence à partir de cette heure.`
    };
  }
  if (now > windowEnd) {
    return {
      allowed: false,
      reason: `La répétition s'est terminée à ${repetition.endTime}. Il n'est plus possible de pointer votre présence.`
    };
  }

  return { allowed: true };
};

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

      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      if (end <= start) {
        return res.status(400).json({
          message: "End time must be after start time.",
        });
      }
    }

    if (!pupitres || !Array.isArray(pupitres) || pupitres.length === 0) {
      return res.status(400).json({
        message: "At least one voice part (pupitre) must be selected.",
      });
    }

    const validPupitres = ["soprano", "alto", "ténor", "basse"];
    const invalidPupitres = pupitres.filter(p => !validPupitres.includes(p));
    if (invalidPupitres.length > 0) {
      return res.status(400).json({
        message: `Invalid voice parts: ${invalidPupitres.join(', ')}`,
      });
    }

    const uniquePupitres = [...new Set(pupitres)];

    const existingReps = await Repetition.find({ date });
    const hasConflictOnDate = existingReps.some((rep) => {
      if (!Array.isArray(rep.pupitres)) return false;
      return uniquePupitres.some(p => rep.pupitres.includes(p));
    });

    if (hasConflictOnDate) {
      return res.status(409).json({
        message: "A rehearsal with overlapping voice parts already exists on this date. Each voice part can only have one rehearsal per day.",
      });
    }

    const repetition = new Repetition({
      ...req.body,
      pupitres: uniquePupitres
    });

    await repetition.save();

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
        const choristes = await User.find({
          role: 'choriste',
          isLocked: false,
          pupitre: { $in: uniquePupitres },
          fcmToken: { $ne: null },
        }).select('fcmToken');

        const tokens = choristes.map(c => c.fcmToken);
        if (tokens.length === 0) return;

        const dateObj = new Date(repetition.date);
        const dateStr = dateObj.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
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
      } catch (e) {
        console.error('[FCM] Erreur notif création répétition:', e);
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating rehearsal." });
  }
};

export const updateRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime, pupitres } = req.body;

    if (startTime && endTime && date) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      let end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      if (end <= start) end.setDate(end.getDate() + 1);
      if (end <= start) {
        return res.status(400).json({ 
          message: "L'heure de fin doit être après l'heure de début." 
        });
      }
    }

    if (!pupitres || !Array.isArray(pupitres) || pupitres.length === 0) {
      return res.status(400).json({
        message: "At least one voice part (pupitre) must be selected.",
      });
    }

    const validPupitres = ["soprano", "alto", "ténor", "basse"];
    const invalidPupitres = pupitres.filter(p => !validPupitres.includes(p));
    if (invalidPupitres.length > 0) {
      return res.status(400).json({
        message: `Invalid voice parts: ${invalidPupitres.join(', ')}`,
      });
    }

    const uniquePupitres = [...new Set(pupitres)];

    const existingReps = await Repetition.find({ 
      date,
      _id: { $ne: req.params.id }
    });

    const hasConflictOnDate = existingReps.some((rep) => {
      if (!Array.isArray(rep.pupitres)) return false;
      return uniquePupitres.some(p => rep.pupitres.includes(p));
    });

    if (hasConflictOnDate) {
      return res.status(409).json({
        message: "A rehearsal with overlapping voice parts already exists on this date. Each voice part can only have one rehearsal per day.",
      });
    }

    // Sauvegarder les anciennes valeurs avant la mise à jour
    const existing = await Repetition.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    const oldStartTime = existing.startTime;
    const oldEndTime = existing.endTime;
    const oldLocation = existing.location;

    const updated = await Repetition.findByIdAndUpdate(
      req.params.id,
      { ...req.body, pupitres: uniquePupitres },
      { new: true, runValidators: true }
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

    // ✅ PUSH NOTIFICATION: notifier les choristes si l'heure ou le lieu a changé
    const timeChanged = (req.body.startTime && req.body.startTime !== oldStartTime) ||
                        (req.body.endTime && req.body.endTime !== oldEndTime);
    const locationChanged = req.body.location && req.body.location !== oldLocation;

    if (timeChanged || locationChanged) {
      setImmediate(async () => {
        try {
          const choristes = await User.find({
            role: 'choriste',
            isLocked: false,
            pupitre: { $in: uniquePupitres },
            fcmToken: { $ne: null },
          }).select('fcmToken');

          const tokens = choristes.map(c => c.fcmToken).filter(Boolean);
          if (tokens.length === 0) return;

          const dateStr = new Date(updated.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
          });

          const changes = [];
          if (timeChanged) changes.push(`Horaire: ${updated.startTime}–${updated.endTime}`);
          if (locationChanged) changes.push(`Lieu: ${updated.location}`);
          const pushBody = `${dateStr} — ${changes.join(' · ')}`;

          await sendPushNotification({
            tokens,
            title: '⚠️ Répétition modifiée',
            body: pushBody,
            data: {
              type: 'repetition_updated',
              repetitionId: updated._id.toString(),
            },
          });
        } catch (e) {
          console.error('[FCM] Erreur notif modification répétition (admin):', e);
        }
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur mise à jour." });
  }
};

// ✅ UPDATED: Filter repetitions by user's pupitre
export const getRepetitions = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const user = await User.findById(userId).select('role pupitre isChefDePupitre');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    let repetitionQuery = {};

    if (user.role === 'manager' || user.role === 'admin' || user.role === 'chef de choeur') {
      repetitionQuery = {};
    } else if (user.role === 'choriste') {
      if (!user.pupitre) {
        return res.status(400).json({ message: 'Pupitre non défini pour ce choriste.' });
      }
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
    const repetition = await Repetition.findById(req.params.id);
    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    // Capture info before deletion for push notification
    const { date, startTime, endTime, location, pupitres: repPupitres } = repetition;

    await Repetition.findByIdAndDelete(req.params.id);
    res.json({ message: "Répétition supprimée définitivement." });

    // ✅ PUSH NOTIFICATION: notify concerned choristes of cancellation
    setImmediate(async () => {
      try {
        const choristes = await User.find({
          role: 'choriste',
          isLocked: false,
          pupitre: { $in: repPupitres },
          fcmToken: { $ne: null },
        }).select('fcmToken');

        const tokens = choristes.map(c => c.fcmToken);
        if (tokens.length === 0) return;

        const dateStr = new Date(date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });

        await sendPushNotification({
          tokens,
          title: '❌ Répétition annulée',
          body: `La répétition du ${dateStr} (${startTime}–${endTime}) à ${location} a été annulée.`,
          data: {
            type: 'repetition_cancelled',
          },
        });
      } catch (e) {
        console.error('[FCM] Erreur notif annulation répétition:', e);
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression." });
  }
};

export const getAttendanceForConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    const config = await Config.findOne();
    const threshold = config ? config.participationThreshold : 70;

    const repetitions = await Repetition.find({ concert: concertId });
    if (!repetitions.length) {
      return res.status(404).json({ 
        message: "Aucune répétition trouvée pour ce concert." 
      });
    }

    const choristes = await User.find({
      role: "choriste",
      isChoristeLocked: { $ne: true },
    });

    const participation = choristes.map((choriste) => {
      let totalRepsForChoriste = 0;
      let attendedReps = 0;

      repetitions.forEach((rep) => {
        if (rep.pupitres.includes(choriste.pupitre)) {
          totalRepsForChoriste++;
          
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
        : 100;

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

// ✅ UPDATED: Presence can only be marked during the repetition window
export const markRepetitionPresence = async (req, res) => {
  const choristeId = req.auth.userId;
  const repetitionId = req.params.id;

  try {
    if (!choristeId) {
      return res.status(400).json({ message: "ID choriste manquant." });
    }

    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    // ✅ NEW: Enforce time window
    const windowCheck = isInsideRepetitionWindow(repetition);
    if (!windowCheck.allowed) {
      return res.status(403).json({ 
        message: windowCheck.reason,
        code: 'OUTSIDE_REPETITION_WINDOW'
      });
    }

    repetition.absentChoristes = repetition.absentChoristes.filter(
      (a) => a.choriste.toString() !== choristeId
    );

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

// ✅ UPDATED: Absence can only be declared during the repetition window
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

    // ✅ NEW: Enforce time window
    const windowCheck = isInsideRepetitionWindow(repetition);
    if (!windowCheck.allowed) {
      return res.status(403).json({ 
        message: windowCheck.reason,
        code: 'OUTSIDE_REPETITION_WINDOW'
      });
    }

    repetition.presentChoristes = repetition.presentChoristes.filter(
      (p) => p.toString() !== choristeId
    );

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

export const getMyChoristesStatus = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }

    const repetition = await Repetition.findById(repetitionId)
      .populate('presentChoristes', 'firstName lastName')
      .populate('absentChoristes.choriste', 'firstName lastName')
      .populate('manualPresences.choriste', 'firstName lastName')
      .populate('manualPresences.addedBy', 'firstName lastName');

    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    if (!repetition.pupitres.includes(chef.pupitre)) {
      return res.status(403).json({ 
        message: `Cette répétition ne concerne pas votre pupitre (${chef.pupitre}). Pupitres concernés: ${repetition.pupitres.join(', ')}` 
      });
    }

    const myPupitreChoristesList = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      isLocked: { $ne: true }
    }).select('firstName lastName email');

    const choristesWithStatus = myPupitreChoristesList.map(choriste => {
      const choristeId = choriste._id.toString();

      const isInPresentList = repetition.presentChoristes.some(
        present => present._id.toString() === choristeId
      );

      const absentRecord = repetition.absentChoristes.find(
        absent => absent.choriste._id.toString() === choristeId
      );

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
        status = manualRecord.type;
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

export const addManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { choristeId, type, reason } = req.body;

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

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent modifier les présences.' 
      });
    }

    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.role !== 'choriste' || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez gérer que les choristes de votre pupitre.' 
      });
    }

    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    repetition.presentChoristes = repetition.presentChoristes.filter(id => 
      !id.equals(choristeId)
    );
    repetition.absentChoristes = repetition.absentChoristes.filter(a => 
      !a.choriste.equals(choristeId)
    );

    repetition.manualPresences = repetition.manualPresences.filter(m => 
      !m.choriste.equals(choristeId)
    );

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

export const removeManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId, choristeId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Choriste introuvable dans votre pupitre.' 
      });
    }

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
      filterType, pupitre, choristeId, date, dateFrom, dateTo, concertId
    } = req.query;

    const validFilterTypes = [
      'general', 'pupitre', 'choriste', 'date', 
      'dateFrom', 'season', 'dateRange', 'programme'
    ];

    if (!filterType || !validFilterTypes.includes(filterType)) {
      return res.status(400).json({ 
        message: 'Type de filtre invalide. Options: ' + validFilterTypes.join(', ')
      });
    }

    let repetitionQuery = {};
    let dateFilter = {};

    switch (filterType) {
      case 'date':
        if (!date) return res.status(400).json({ message: 'Date requise pour ce filtre.' });
        dateFilter = {
          date: {
            $gte: new Date(date),
            $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        };
        break;
      case 'dateFrom':
        if (!dateFrom) return res.status(400).json({ message: 'Date de début requise pour ce filtre.' });
        dateFilter = { date: { $gte: new Date(dateFrom) } };
        break;
      case 'season':
        const now = new Date();
        const currentYear = now.getFullYear();
        const seasonStart = now.getMonth() >= 8 
          ? new Date(currentYear, 8, 1) 
          : new Date(currentYear - 1, 8, 1);
        dateFilter = { date: { $gte: seasonStart } };
        break;
      case 'dateRange':
        if (!dateFrom || !dateTo) return res.status(400).json({ message: 'Dates de début et fin requises pour ce filtre.' });
        dateFilter = { date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) } };
        break;
      case 'programme':
        if (!concertId) return res.status(400).json({ message: 'ID du concert/programme requis pour ce filtre.' });
        repetitionQuery.concert = concertId;
        break;
    }

    const finalQuery = { ...repetitionQuery, ...dateFilter };

    const repetitions = await Repetition.find(finalQuery)
      .populate('concert', 'title')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.addedBy', 'firstName lastName')
      .sort({ date: -1 });

    if (!repetitions.length) {
      return res.json({
        filterType,
        filterValue: getFilterValue(req.query),
        period: getPeriodInfo(filterType, req.query),
        statistics: { totalRepetitions: 0, totalAbsences: 0, absenceRate: 0 },
        absenceRecords: []
      });
    }

    let allAbsenceRecords = [];

    repetitions.forEach(repetition => {
      repetition.absentChoristes.forEach(absent => {
        if (absent.choriste && repetition.pupitres.includes(absent.choriste.pupitre)) {
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
              pupitres: repetition.pupitres,
              concert: repetition.concert
            },
            reason: absent.reason,
            isManual: false,
            addedAt: repetition.createdAt
          });
        }
      });

      repetition.manualPresences
        .filter(manual => manual.type === 'absent')
        .forEach(manual => {
          if (manual.choriste && repetition.pupitres.includes(manual.choriste.pupitre)) {
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
                pupitres: repetition.pupitres,
                concert: repetition.concert
              },
              reason: manual.reason,
              isManual: true,
              addedBy: `${manual.addedBy.firstName} ${manual.addedBy.lastName}`,
              addedAt: manual.addedAt
            });
          }
        });
    });

    // Apply pupitre / choriste filter
    let filteredRecords = allAbsenceRecords;
    if (filterType === 'pupitre' && pupitre) {
      filteredRecords = allAbsenceRecords.filter(r => r.choriste.pupitre === pupitre);
    } else if (filterType === 'choriste' && choristeId) {
      filteredRecords = allAbsenceRecords.filter(r => r.choriste._id.toString() === choristeId);
    }

    const totalRepetitions = repetitions.length;
    const totalAbsences = filteredRecords.length;
    const uniqueChoristes = new Set(filteredRecords.map(r => r.choriste._id.toString())).size;
    const absenceRate = totalRepetitions > 0 
      ? ((totalAbsences / (totalRepetitions * uniqueChoristes || 1)) * 100).toFixed(1)
      : '0.0';

    let mostAbsentChoriste = null;
    if (filteredRecords.length > 0) {
      const absenceCountByChpriste = {};
      filteredRecords.forEach(record => {
        const id = record.choriste._id.toString();
        absenceCountByChpriste[id] = (absenceCountByChpriste[id] || 0) + 1;
      });
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

const getPeriodInfo = (filterType, query) => {
  const { date, dateFrom, dateTo } = query;
  switch (filterType) {
    case 'date': return { start: date, end: date, type: 'single-date' };
    case 'dateFrom': return { start: dateFrom, end: new Date().toISOString().split('T')[0], type: 'from-date' };
    case 'season':
      const now = new Date();
      const currentYear = now.getFullYear();
      const seasonStart = now.getMonth() >= 8 ? `${currentYear}-09-01` : `${currentYear - 1}-09-01`;
      return { start: seasonStart, end: new Date().toISOString().split('T')[0], type: 'season' };
    case 'dateRange': return { start: dateFrom, end: dateTo, type: 'range' };
    default: return { start: null, end: null, type: 'all-time' };
  }
};

export const modifyRepetitionForAllChoristes = async (req, res) => {
  try {
    const managerId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { newStartTime, newEndTime, newLocation, urgentMessage, reason } = req.body;

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les managers peuvent modifier les répétitions.' 
      });
    }

    const repetition = await Repetition.findById(repetitionId).populate('concert');
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const repetitionDate = new Date(repetition.date);
    repetitionDate.setHours(0, 0, 0, 0);

    if (repetitionDate < today) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition passée. Cette répétition a déjà eu lieu.' 
      });
    }

    if (repetitionDate.getTime() === today.getTime() && currentHour >= 18) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition d\'aujourd\'hui après 18h00. La période de modification est fermée.' 
      });
    }

    if (!newStartTime && !newEndTime && !newLocation && !urgentMessage) {
      return res.status(400).json({ 
        message: 'Au moins une modification est requise.' 
      });
    }

    repetition.managerModifications = repetition.managerModifications || [];
    repetition.managerModifications = repetition.managerModifications.filter(mod => 
      mod.manager.toString() !== managerId.toString()
    );

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

    repetition.managerModifications.push(modificationData);
    await repetition.save();

    const savedModification = repetition.managerModifications[repetition.managerModifications.length - 1];

    res.json({ 
      message: 'Modification enregistrée.',
      modificationId: savedModification._id,
      totalChoristes: 0
    });

    // ✅ BACKGROUND: emails + push notification for update
    setImmediate(async () => {
      try {
        const relevantChoristesList = await User.find({
          role: 'choriste',
          isLocked: { $ne: true },
          pupitre: { $in: repetition.pupitres }
        }).select('firstName lastName email pupitre fcmToken');

        const dateStr = new Date(repetition.date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });

        // Build readable change summary for push notif
        const changes = [];
        if (newStartTime || newEndTime) changes.push(`Horaire: ${newStartTime || repetition.startTime}–${newEndTime || repetition.endTime}`);
        if (newLocation) changes.push(`Lieu: ${newLocation}`);
        if (urgentMessage) changes.push(urgentMessage);
        const pushBody = changes.length > 0 
          ? `${dateStr} — ${changes.join(' · ')}`
          : `Modification pour la répétition du ${dateStr}`;

        // Push notifications (batch)
        const fcmTokens = relevantChoristesList.map(c => c.fcmToken).filter(Boolean);
        if (fcmTokens.length > 0) {
          await sendPushNotification({
            tokens: fcmTokens,
            title: '⚠️ Répétition modifiée',
            body: pushBody,
            data: {
              type: 'repetition_updated',
              repetitionId: repetitionId.toString(),
            },
          });
        }

        // Emails
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

        const updatedRepetition = await Repetition.findById(repetitionId);
        const modificationToUpdate = updatedRepetition.managerModifications.id(savedModification._id);
        if (modificationToUpdate) {
          modificationToUpdate.notificationsSent = true;
          await updatedRepetition.save();
        }

      } catch (emailError) {
        console.error('Error sending modification notifications:', emailError);
      }
    });

  } catch (error) {
    console.error('Error saving manager modification:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getRepetitionsForManager = async (req, res) => {
  try {
    const managerId = req.auth.userId;

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les managers peuvent accéder à cette fonctionnalité.' 
      });
    }

    const repetitions = await Repetition.find()
      .populate('concert', 'title')
      .populate({
        path: 'managerModifications.manager',
        select: 'firstName lastName'
      })
      .sort({ date: 1 });

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
      managerInfo: { name: `${manager.firstName} ${manager.lastName}` }
    });

  } catch (error) {
    console.error('Error getting repetitions for manager:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getComprehensiveAbsenceReport = async (req, res) => {
  try {
    const {
      filterType, pupitre, choristeId, date, dateFrom, dateTo, concertId
    } = req.query;

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

    let repetitionQuery = {};
    let dateFilter = {};
    let concertDateFilter = {};

    switch (filterType) {
      case 'date':
        if (!date) return res.status(400).json({ message: 'Date requise pour ce filtre.' });
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        dateFilter = { date: { $gte: targetDate, $lt: nextDay } };
        concertDateFilter = { dateHeure: { $gte: targetDate, $lt: nextDay } };
        break;
      case 'dateFrom':
        if (!dateFrom) return res.status(400).json({ message: 'Date de début requise.' });
        dateFilter = { date: { $gte: new Date(dateFrom) } };
        concertDateFilter = { dateHeure: { $gte: new Date(dateFrom) } };
        break;
      case 'season':
        const now2 = new Date();
        const yr = now2.getFullYear();
        const ss = now2.getMonth() >= 8 ? new Date(yr, 8, 1) : new Date(yr - 1, 8, 1);
        dateFilter = { date: { $gte: ss } };
        concertDateFilter = { dateHeure: { $gte: ss } };
        break;
      case 'dateRange':
        if (!dateFrom || !dateTo) return res.status(400).json({ message: 'Dates de début et fin requises.' });
        dateFilter = { date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) } };
        concertDateFilter = { dateHeure: { $gte: new Date(dateFrom), $lte: new Date(dateTo) } };
        break;
      case 'programme':
        if (!concertId) return res.status(400).json({ message: 'ID du concert/programme requis.' });
        repetitionQuery.concert = concertId;
        break;
    }

    const finalRepQuery = { ...repetitionQuery, ...dateFilter };

    const [repetitions, concerts, choristes, config] = await Promise.all([
      Repetition.find(finalRepQuery)
        .populate('concert', 'title')
        .populate('presentChoristes', '_id pupitre')
        .populate('absentChoristes.choriste', '_id pupitre')
        .populate('manualPresences.choriste', '_id pupitre')
        .sort({ date: 1 }),
      Concert.find({ ...concertDateFilter })
        .populate('finalParticipants', '_id')
        .populate('availableChoristes', '_id')
        .populate('absentChoristes.choriste', '_id')
        .sort({ dateHeure: 1 }),
      User.find({
        role: 'choriste',
        isLocked: { $ne: true },
        ...(filterType === 'pupitre' && pupitre ? { pupitre } : {}),
        ...(filterType === 'choriste' && choristeId ? { _id: choristeId } : {}),
      }).select('firstName lastName email pupitre eliminationRecords'),
      Config.findOne()
    ]);

    const threshold = config ? config.participationThreshold : 70;

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

    const choristesData = choristes.map(choriste => {
      const relevantRepetitions = repetitions.filter(rep => 
        rep.pupitres.includes(choriste.pupitre)
      );

      const totalRepetitions = relevantRepetitions.length;
      let attendedRepetitions = 0;
      let repetitionAbsences = [];

      relevantRepetitions.forEach(repetition => {
        let isPresent = false;
        let absenceReason = null;

        if (repetition.presentChoristes.some(
          present => present._id.toString() === choriste._id.toString()
        )) isPresent = true;

        const autoAbsent = repetition.absentChoristes.find(
          absent => absent.choriste._id.toString() === choriste._id.toString()
        );
        if (autoAbsent) { isPresent = false; absenceReason = autoAbsent.reason; }

        const manualPresence = repetition.manualPresences.find(
          manual => manual.choriste._id.toString() === choriste._id.toString()
        );
        if (manualPresence) {
          isPresent = manualPresence.type === 'present';
          if (!isPresent) absenceReason = manualPresence.reason;
        }

        if (isPresent) {
          attendedRepetitions++;
        } else {
          repetitionAbsences.push({
            repetitionId: repetition._id,
            date: repetition.date,
            location: repetition.location,
            concertTitle: repetition.concert?.title || 'Concert non défini',
            pupitres: repetition.pupitres,
            reason: absenceReason || 'Non marqué présent',
            isManual: !!manualPresence
          });
        }
      });

      const repetitionAttendanceRate = totalRepetitions > 0 
        ? (attendedRepetitions / totalRepetitions) * 100 
        : 100;

      const totalConcerts = concerts.length;
      let validatedConcerts = 0;
      let concertAbsences = [];

      concerts.forEach(concert => {
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

        if (isValidated && !isEliminated) {
          validatedConcerts++;
        } else {
          let absenceReason = 'N\'a pas marqué sa disponibilité';
          if (isEliminated) absenceReason = 'Éliminé';
          else if (absentRecord) absenceReason = getAbsenceReasonMessage(absentRecord.reason);
          else if (hasMarkedAvailability && !isValidated) absenceReason = 'Disponible mais non validé';

          concertAbsences.push({
            concertId: concert._id,
            title: concert.title,
            dateHeure: concert.dateHeure,
            reason: absenceReason,
            markedAt: absentRecord?.markedAt || null
          });
        }
      });

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
        repetitionStats: {
          totalRepetitions,
          attendedRepetitions,
          attendanceRate: Math.round(repetitionAttendanceRate * 10) / 10,
          absencesCount: totalRepetitions - attendedRepetitions,
          allRepetitionsCount: repetitions.length,
          pupitreSpecificNote: totalRepetitions < repetitions.length 
            ? `Seules les ${totalRepetitions} répétitions concernant votre pupitre (${choriste.pupitre}) sont prises en compte.`
            : null
        },
        concertStats: {
          totalConcerts,
          availableConcerts: validatedConcerts,
          attendanceRate: Math.round(concertAttendanceRate * 10) / 10,
          absencesCount: totalConcerts - validatedConcerts
        },
        repetitionAbsences,
        concertAbsences,
        overallAttendanceRate: Math.round(((repetitionAttendanceRate + concertAttendanceRate) / 2) * 10) / 10,
        isAtRisk: repetitionAttendanceRate < threshold || concertAttendanceRate < threshold
      };
    });

    choristesData.sort((a, b) => {
      const aOverall = (a.repetitionStats.attendanceRate + a.concertStats.attendanceRate) / 2;
      const bOverall = (b.repetitionStats.attendanceRate + b.concertStats.attendanceRate) / 2;
      return aOverall - bOverall;
    });

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

const getAbsenceReasonMessage = (reason) => {
  switch (reason) {
    case 'did_not_mark_disponibilite': return 'N\'a pas marqué sa disponibilité';
    case 'removed_by_admin': return 'Retiré par admin';
    case 'removed_by_chef': return 'Retiré par chef de pupitre';
    case 'manual_absence': return 'Absence manuelle';
    default: return 'Absent';
  }
};