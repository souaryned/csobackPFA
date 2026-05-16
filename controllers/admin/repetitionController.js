// ============================================================
// repetitionController.js
// ✅ FIXES :
//   - sendPushInBackground : getFcmTokensForPupitres() déplacé
//     DANS le setImmediate pour ne pas bloquer la réponse HTTP
//   - Toutes les notifications (création, modif, suppression)
//     sont correctement envoyées en arrière-plan
// ============================================================

import Repetition from "../../models/repetitionModel.js";
import User from "../../models/userModel.js";
import Config from "../../models/configModel.js";
import Concert from "../../models/concertModel.js";
import { createManagerModificationTemplate } from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { sendPushNotification } from "../../tools/push/fcmService.js";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const VALID_PUPITRES = ["soprano", "alto", "ténor", "basse"];

// ─────────────────────────────────────────────────────────────
// HELPERS PRIVÉS
// ─────────────────────────────────────────────────────────────

const isInsideRepetitionWindow = (repetition) => {
  const now = new Date();

  const repDate = new Date(repetition.date);
  const repDateOnly = new Date(
    repDate.getFullYear(),
    repDate.getMonth(),
    repDate.getDate(),
  );
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (repDateOnly.getTime() !== todayOnly.getTime()) {
    const isPast = repDateOnly < todayOnly;
    return {
      allowed: false,
      reason: isPast
        ? "Cette répétition est déjà passée."
        : "Cette répétition n'a pas encore commencé.",
    };
  }

  const [startH, startM] = repetition.startTime.split(":").map(Number);
  const [endH, endM] = repetition.endTime.split(":").map(Number);

  const windowStart = new Date(
    repDate.getFullYear(),
    repDate.getMonth(),
    repDate.getDate(),
    startH,
    startM,
    0,
  );
  let windowEnd = new Date(
    repDate.getFullYear(),
    repDate.getMonth(),
    repDate.getDate(),
    endH,
    endM,
    0,
  );

  if (windowEnd <= windowStart) windowEnd.setDate(windowEnd.getDate() + 1);

  if (now < windowStart) {
    return {
      allowed: false,
      reason: `La répétition commence à ${repetition.startTime}. Vous pourrez pointer votre présence à partir de cette heure.`,
    };
  }
  if (now > windowEnd) {
    return {
      allowed: false,
      reason: `La répétition s'est terminée à ${repetition.endTime}. Il n'est plus possible de pointer votre présence.`,
    };
  }

  return { allowed: true };
};

const validateTimeRange = (date, startTime, endTime) => {
  if (!date || !startTime || !endTime) return { valid: true };

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const start = new Date(date);
  start.setHours(startH, startM, 0, 0);

  const end = new Date(date);
  end.setHours(endH, endM, 0, 0);

  if (end <= start) end.setDate(end.getDate() + 1);
  if (end <= start)
    return {
      valid: false,
      error: "L'heure de fin doit être après l'heure de début.",
    };

  return { valid: true };
};

const validatePupitres = (pupitres) => {
  if (!pupitres || !Array.isArray(pupitres) || pupitres.length === 0) {
    return {
      valid: false,
      error: "Au moins un pupitre doit être sélectionné.",
    };
  }

  const invalid = pupitres.filter((p) => !VALID_PUPITRES.includes(p));
  if (invalid.length > 0) {
    return {
      valid: false,
      error: `Pupitres invalides : ${invalid.join(", ")}`,
    };
  }

  return { valid: true, uniquePupitres: [...new Set(pupitres)] };
};

// ✅ FIX : getFcmTokensForPupitres() est maintenant appelé DANS
// le setImmediate, pas avant. Cela évite de bloquer la réponse HTTP.
const sendPushInBackground = (pupitres, buildPayload) => {
  setImmediate(async () => {
    try {
      const tokens = await getFcmTokensForPupitres(pupitres);
      if (!tokens || tokens.length === 0) return;
      const payload = buildPayload(tokens);
      await sendPushNotification(payload);
    } catch (e) {
      console.error("[FCM] Erreur notification push:", e);
    }
  });
};

const getFcmTokensForPupitres = async (pupitres) => {
  const choristes = await User.find({
    role: "choriste",
    isLocked: { $ne: true },
    pupitre: { $in: pupitres },
    fcmToken: { $ne: null },
  }).select("fcmToken");

  return choristes.map((c) => c.fcmToken).filter(Boolean);
};

const formatDateFr = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

// ─────────────────────────────────────────────────────────────
// HELPERS RAPPORT
// ─────────────────────────────────────────────────────────────

const getFilterValue = (query) => {
  const { filterType, pupitre, choristeId, date, dateFrom, dateTo, concertId } =
    query;
  switch (filterType) {
    case "general":
      return "Tous les choristes";
    case "pupitre":
      return pupitre || "Pupitre non spécifié";
    case "choriste":
      return choristeId || "Choriste non spécifié";
    case "date":
      return date || "Date non spécifiée";
    case "dateFrom":
      return `Depuis ${dateFrom || "date non spécifiée"}`;
    case "season":
      return "Depuis début de saison";
    case "dateRange":
      return `Du ${dateFrom || "?"} au ${dateTo || "?"}`;
    case "programme":
      return concertId || "Programme non spécifié";
    default:
      return "Filtre inconnu";
  }
};

const getPeriodInfo = (filterType, query) => {
  const { date, dateFrom, dateTo } = query;
  const today = new Date().toISOString().split("T")[0];

  switch (filterType) {
    case "date":
      return { start: date, end: date, type: "single-date" };
    case "dateFrom":
      return { start: dateFrom, end: today, type: "from-date" };
    case "season": {
      const now = new Date();
      const yr = now.getFullYear();
      const seasonStart =
        now.getMonth() >= 8 ? `${yr}-09-01` : `${yr - 1}-09-01`;
      return { start: seasonStart, end: today, type: "season" };
    }
    case "dateRange":
      return { start: dateFrom, end: dateTo, type: "range" };
    default:
      return { start: null, end: null, type: "all-time" };
  }
};

const getAbsenceReasonMessage = (reason) => {
  switch (reason) {
    case "did_not_mark_disponibilite":
      return "N'a pas marqué sa disponibilité";
    case "removed_by_admin":
      return "Retiré par admin";
    case "removed_by_chef":
      return "Retiré par chef de pupitre";
    case "manual_absence":
      return "Absence manuelle";
    default:
      return "Absent";
  }
};

const VALID_FILTER_TYPES = [
  "general",
  "pupitre",
  "choriste",
  "date",
  "dateFrom",
  "season",
  "dateRange",
  "programme",
];

const buildDateFilters = (filterType, query) => {
  const { date, dateFrom, dateTo, concertId } = query;

  let repetitionQuery = {};
  let dateFilter = {};

  switch (filterType) {
    case "date": {
      const target = new Date(date);
      const nextDay = new Date(target);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFilter = { date: { $gte: target, $lt: nextDay } };
      break;
    }
    case "dateFrom":
      dateFilter = { date: { $gte: new Date(dateFrom) } };
      break;
    case "season": {
      const now = new Date();
      const yr = now.getFullYear();
      const ss =
        now.getMonth() >= 8 ? new Date(yr, 8, 1) : new Date(yr - 1, 8, 1);
      dateFilter = { date: { $gte: ss } };
      break;
    }
    case "dateRange":
      dateFilter = {
        date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
      };
      break;
    case "programme":
      repetitionQuery.concert = concertId;
      break;
    default:
      break;
  }

  return { repetitionQuery, dateFilter };
};

// ─────────────────────────────────────────────────────────────
// CRUD RÉPÉTITIONS
// ─────────────────────────────────────────────────────────────

export const createRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime, pupitres } = req.body;

    const timeCheck = validateTimeRange(date, startTime, endTime);
    if (!timeCheck.valid)
      return res.status(400).json({ message: timeCheck.error });

    const pupitreCheck = validatePupitres(pupitres);
    if (!pupitreCheck.valid)
      return res.status(400).json({ message: pupitreCheck.error });
    const { uniquePupitres } = pupitreCheck;

    const existingReps = await Repetition.find({ date });
    const hasConflict = existingReps.some(
      (rep) =>
        Array.isArray(rep.pupitres) &&
        uniquePupitres.some((p) => rep.pupitres.includes(p)),
    );
    if (hasConflict) {
      return res.status(409).json({
        message:
          "Un pupitre de cette répétition a déjà une répétition ce jour-là.",
      });
    }

    const repetition = new Repetition({
      ...req.body,
      pupitres: uniquePupitres,
    });
    await repetition.save();

    res.status(201).json({
      message: "Répétition créée avec succès.",
      repetition: { _id: repetition._id, pupitres: repetition.pupitres },
    });

    // ✅ Notification création — tokens récupérés DANS le background
    sendPushInBackground(uniquePupitres, (tokens) => ({
      tokens,
      title: "🎵 Nouvelle répétition programmée",
      body: `${formatDateFr(repetition.date)} de ${repetition.startTime} à ${repetition.endTime} — ${repetition.location}`,
      data: {
        type: "new_repetition",
        repetitionId: repetition._id.toString(),
      },
    }));
  } catch (error) {
    console.error("[createRepetition]", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création de la répétition." });
  }
};

export const updateRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime, pupitres } = req.body;

    const timeCheck = validateTimeRange(date, startTime, endTime);
    if (!timeCheck.valid)
      return res.status(400).json({ message: timeCheck.error });

    const pupitreCheck = validatePupitres(pupitres);
    if (!pupitreCheck.valid)
      return res.status(400).json({ message: pupitreCheck.error });
    const { uniquePupitres } = pupitreCheck;

    const existingReps = await Repetition.find({
      date,
      _id: { $ne: req.params.id },
    });
    const hasConflict = existingReps.some(
      (rep) =>
        Array.isArray(rep.pupitres) &&
        uniquePupitres.some((p) => rep.pupitres.includes(p)),
    );
    if (hasConflict) {
      return res.status(409).json({
        message:
          "Un pupitre de cette répétition a déjà une répétition ce jour-là.",
      });
    }

    const existing = await Repetition.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Répétition introuvable." });

    const {
      startTime: oldStart,
      endTime: oldEnd,
      location: oldLocation,
      date: oldDate,
    } = existing;

    const dateChanged =
      new Date(date).toDateString() !== new Date(oldDate).toDateString();
    const timeChanged = startTime !== oldStart || endTime !== oldEnd;
    const locationChanged =
      req.body.location && req.body.location !== oldLocation;

    // ✅ Reset des flags remindersSent si date OU heure change
    const reminderReset =
      dateChanged || timeChanged
        ? {
            "remindersSent.dayBefore": false,
            "remindersSent.twoHours": false,
            "remindersSent.tenMinutes": false,
          }
        : {};

    const updated = await Repetition.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        pupitres: uniquePupitres,
        ...reminderReset,
      },
      { new: true, runValidators: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Répétition introuvable." });

    res.json({
      message: "Répétition mise à jour avec succès.",
      updated: { _id: updated._id, pupitres: updated.pupitres },
    });

    // ✅ Notification modification — envoyée seulement si quelque chose a changé
    // tokens récupérés DANS le background pour ne pas bloquer la réponse
    if (dateChanged || timeChanged || locationChanged) {
      const changes = [];
      if (dateChanged) changes.push(`Date : ${formatDateFr(updated.date)}`);
      if (timeChanged)
        changes.push(`Horaire : ${updated.startTime}–${updated.endTime}`);
      if (locationChanged) changes.push(`Lieu : ${updated.location}`);

      sendPushInBackground(uniquePupitres, (tokens) => ({
        tokens,
        title: "⚠️ Répétition modifiée",
        body: `${formatDateFr(updated.date)} — ${changes.join(" · ")}`,
        data: {
          type: "repetition_updated",
          repetitionId: updated._id.toString(),
        },
      }));
    }
  } catch (error) {
    console.error("[updateRepetition]", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

export const deleteRepetitionPermanent = async (req, res) => {
  try {
    const repetition = await Repetition.findById(req.params.id);
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    const {
      date,
      startTime,
      endTime,
      location,
      pupitres: repPupitres,
    } = repetition;

    await Repetition.findByIdAndDelete(req.params.id);

    res.json({ message: "Répétition supprimée définitivement." });

    // ✅ Notification annulation — tokens récupérés DANS le background
    sendPushInBackground(repPupitres, (tokens) => ({
      tokens,
      title: "❌ Répétition annulée",
      body: `La répétition du ${formatDateFr(date)} (${startTime}–${endTime}) à ${location} a été annulée.`,
      data: { type: "repetition_cancelled" },
    }));
  } catch (error) {
    console.error("[deleteRepetitionPermanent]", error);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};

// ─────────────────────────────────────────────────────────────
// LECTURE RÉPÉTITIONS
// ─────────────────────────────────────────────────────────────

export const getRepetitions = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select(
      "role pupitre isChefDePupitre",
    );
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    let query = {};
    if (user.role === "choriste") {
      if (!user.pupitre)
        return res
          .status(400)
          .json({ message: "Pupitre non défini pour ce choriste." });
      query = { pupitres: { $in: [user.pupitre] } };
    } else if (!["manager", "admin", "chef de choeur"].includes(user.role)) {
      return res.status(403).json({ message: "Accès non autorisé." });
    }

    const repetitions = await Repetition.find(query)
      .populate("concert", "title")
      .populate("presentChoristes", "firstName lastName pupitre")
      .populate("absentChoristes.choriste", "firstName lastName pupitre")
      .populate("manualPresences.choriste", "firstName lastName pupitre")
      .populate("manualPresences.addedBy", "firstName lastName")
      .populate({
        path: "managerModifications.manager",
        select: "firstName lastName",
        options: { strictPopulate: false },
      })
      .sort({ date: 1 });

    res.json(repetitions);
  } catch (error) {
    console.error("[getRepetitions]", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des répétitions." });
  }
};

export const getRepetitionsByConcert = async (req, res) => {
  try {
    const repetitions = await Repetition.find({
      concert: req.params.concertId,
    });
    res.json(repetitions);
  } catch (error) {
    console.error("[getRepetitionsByConcert]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getRepetitionsForManager = async (req, res) => {
  try {
    const manager = await User.findById(req.auth.userId);
    if (!manager || manager.role !== "manager") {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const repetitions = await Repetition.find()
      .populate("concert", "title")
      .populate({
        path: "managerModifications.manager",
        select: "firstName lastName",
      })
      .sort({ date: 1 });

    const managerId = manager._id.toString();

    const result = repetitions.map((rep) => {
      const repObj = rep.toObject();
      const myMod = rep.managerModifications?.find((mod) => {
        const id = mod.manager._id
          ? mod.manager._id.toString()
          : mod.manager.toString();
        return id === managerId;
      });
      repObj.hasMyModification = !!myMod;
      repObj.myModification = myMod || null;
      return repObj;
    });

    res.json({
      repetitions: result,
      managerInfo: { name: `${manager.firstName} ${manager.lastName}` },
    });
  } catch (error) {
    console.error("[getRepetitionsForManager]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// PRÉSENCES / ABSENCES (CHORISTE)
// ─────────────────────────────────────────────────────────────

export const markRepetitionPresence = async (req, res) => {
  const choristeId = req.auth.userId;

  try {
    if (!choristeId)
      return res.status(400).json({ message: "ID choriste manquant." });

    const repetition = await Repetition.findById(req.params.id);
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    const windowCheck = isInsideRepetitionWindow(repetition);
    if (!windowCheck.allowed) {
      return res.status(403).json({
        message: windowCheck.reason,
        code: "OUTSIDE_REPETITION_WINDOW",
      });
    }

    repetition.absentChoristes = repetition.absentChoristes.filter(
      (a) => a.choriste.toString() !== choristeId,
    );
    if (!repetition.presentChoristes.includes(choristeId)) {
      repetition.presentChoristes.push(choristeId);
    }

    await repetition.save();
    res.json({ message: "Présence enregistrée avec succès." });
  } catch (err) {
    console.error("[markRepetitionPresence]", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
};

export const markRepetitionAbsence = async (req, res) => {
  const choristeId = req.auth.userId;
  const { reason } = req.body;

  try {
    const repetition = await Repetition.findById(req.params.id);
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    if (!reason || reason.trim() === "") {
      return res
        .status(400)
        .json({ message: "Le motif d'absence est requis." });
    }

    const windowCheck = isInsideRepetitionWindow(repetition);
    if (!windowCheck.allowed) {
      return res.status(403).json({
        message: windowCheck.reason,
        code: "OUTSIDE_REPETITION_WINDOW",
      });
    }

    repetition.presentChoristes = repetition.presentChoristes.filter(
      (p) => p.toString() !== choristeId,
    );
    const alreadyAbsent = repetition.absentChoristes.some(
      (a) => a.choriste.toString() === choristeId,
    );
    if (!alreadyAbsent) {
      repetition.absentChoristes.push({
        choriste: choristeId,
        reason,
        markedAt: new Date(),
      });
    }

    await repetition.save();
    res.json({ message: "Absence enregistrée avec succès." });
  } catch (err) {
    console.error("[markRepetitionAbsence]", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
};

// ─────────────────────────────────────────────────────────────
// PRÉSENCES MANUELLES (CHEF DE PUPITRE)
// ─────────────────────────────────────────────────────────────

export const getMyChoristesStatus = async (req, res) => {
  try {
    const chef = await User.findById(req.auth.userId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res.status(403).json({
        message:
          "Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.",
      });
    }

    const repetition = await Repetition.findById(req.params.id)
      .populate("presentChoristes", "firstName lastName")
      .populate("absentChoristes.choriste", "firstName lastName")
      .populate("manualPresences.choriste", "firstName lastName")
      .populate("manualPresences.addedBy", "firstName lastName");

    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    if (!repetition.pupitres.includes(chef.pupitre)) {
      return res.status(403).json({
        message: `Cette répétition ne concerne pas votre pupitre (${chef.pupitre}).`,
      });
    }

    const myChoristesList = await User.find({
      role: "choriste",
      pupitre: chef.pupitre,
      isLocked: { $ne: true },
    }).select("firstName lastName email");

    const choristesWithStatus = myChoristesList.map((choriste) => {
      const id = choriste._id.toString();

      const isPresent = repetition.presentChoristes.some(
        (p) => p._id.toString() === id,
      );
      const absentRec = repetition.absentChoristes.find(
        (a) => a.choriste._id.toString() === id,
      );
      const manualRec = repetition.manualPresences.find(
        (m) => m.choriste._id.toString() === id,
      );

      let status = "no-response";
      let isManual = false;
      let manualReason = null;
      let addedBy = null;
      let addedAt = null;
      let automaticReason = null;

      if (manualRec) {
        status = manualRec.type;
        isManual = true;
        manualReason = manualRec.reason;
        addedBy = `${manualRec.addedBy.firstName} ${manualRec.addedBy.lastName}`;
        addedAt = manualRec.addedAt;
      } else if (isPresent) {
        status = "present";
        automaticReason = "Marqué présent automatiquement";
      } else if (absentRec) {
        status = "absent";
        automaticReason = absentRec.reason;
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
        automaticReason,
      };
    });

    res.json({
      repetition: {
        _id: repetition._id,
        date: repetition.date,
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location,
        pupitres: repetition.pupitres,
      },
      chefPupitre: chef.pupitre,
      choristes: choristesWithStatus,
    });
  } catch (error) {
    console.error("[getMyChoristesStatus]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const addManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { choristeId, type, reason } = req.body;

    if (!choristeId || !type || !reason?.trim()) {
      return res
        .status(400)
        .json({ message: "Choriste, type de présence et motif sont requis." });
    }
    if (!["present", "absent"].includes(type)) {
      return res
        .status(400)
        .json({ message: 'Type invalide. Doit être "present" ou "absent".' });
    }

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const choriste = await User.findById(choristeId);
    if (
      !choriste ||
      choriste.role !== "choriste" ||
      choriste.pupitre !== chef.pupitre
    ) {
      return res.status(403).json({
        message: "Vous ne pouvez gérer que les choristes de votre pupitre.",
      });
    }

    const repetition = await Repetition.findById(req.params.id);
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    repetition.presentChoristes = repetition.presentChoristes.filter(
      (id) => !id.equals(choristeId),
    );
    repetition.absentChoristes = repetition.absentChoristes.filter(
      (a) => !a.choriste.equals(choristeId),
    );
    repetition.manualPresences = repetition.manualPresences.filter(
      (m) => !m.choriste.equals(choristeId),
    );

    repetition.manualPresences.push({
      choriste: choristeId,
      addedBy: chefId,
      reason: reason.trim(),
      type,
    });

    await repetition.save();
    res.json({
      message: `Présence manuelle "${type}" ajoutée pour ${choriste.firstName} ${choriste.lastName}.`,
      action: type,
      choriste: { firstName: choriste.firstName, lastName: choriste.lastName },
    });
  } catch (error) {
    console.error("[addManualPresence]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const removeManualPresence = async (req, res) => {
  try {
    const chef = await User.findById(req.auth.userId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const choriste = await User.findById(req.params.choristeId);
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res
        .status(403)
        .json({ message: "Choriste introuvable dans votre pupitre." });
    }

    const repetition = await Repetition.findById(req.params.id);
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    repetition.manualPresences = repetition.manualPresences.filter(
      (m) => !m.choriste.equals(req.params.choristeId),
    );
    await repetition.save();

    res.json({
      message: `Présence manuelle supprimée pour ${choriste.firstName} ${choriste.lastName}.`,
    });
  } catch (error) {
    console.error("[removeManualPresence]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// MODIFICATION MANAGER
// ─────────────────────────────────────────────────────────────

export const modifyRepetitionForAllChoristes = async (req, res) => {
  try {
    const managerId = req.auth.userId;
    const { newStartTime, newEndTime, newLocation, urgentMessage, reason } =
      req.body;

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== "manager") {
      return res.status(403).json({
        message:
          "Accès refusé. Seuls les managers peuvent modifier les répétitions.",
      });
    }

    const repetition = await Repetition.findById(req.params.id).populate(
      "concert",
    );
    if (!repetition)
      return res.status(404).json({ message: "Répétition introuvable." });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const repDay = new Date(
      new Date(repetition.date).getFullYear(),
      new Date(repetition.date).getMonth(),
      new Date(repetition.date).getDate(),
    );

    if (repDay < today) {
      return res
        .status(400)
        .json({ message: "Impossible de modifier une répétition passée." });
    }
    if (repDay.getTime() === today.getTime() && now.getHours() >= 18) {
      return res.status(400).json({
        message:
          "Impossible de modifier une répétition d'aujourd'hui après 18h00.",
      });
    }
    if (!newStartTime && !newEndTime && !newLocation && !urgentMessage) {
      return res
        .status(400)
        .json({ message: "Au moins une modification est requise." });
    }

    repetition.managerModifications = (
      repetition.managerModifications || []
    ).filter((mod) => mod.manager.toString() !== managerId.toString());

    const modificationData = {
      manager: managerId,
      modifications: {
        newStartTime: newStartTime || null,
        newEndTime: newEndTime || null,
        newLocation: newLocation || null,
        urgentMessage: urgentMessage || null,
        reason: reason || null,
      },
      originalValues: {
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location,
      },
      notificationsSent: false,
      modifiedAt: new Date(),
    };

    repetition.managerModifications.push(modificationData);
    await repetition.save();

    const savedMod =
      repetition.managerModifications[
        repetition.managerModifications.length - 1
      ];

    res.json({
      message: "Modification enregistrée.",
      modificationId: savedMod._id,
      totalChoristes: 0,
    });

    setImmediate(async () => {
      try {
        const choristes = await User.find({
          role: "choriste",
          isLocked: { $ne: true },
          pupitre: { $in: repetition.pupitres },
        }).select("firstName lastName email pupitre fcmToken");

        const dateStr = formatDateFr(repetition.date);
        const changes = [];
        if (newStartTime || newEndTime)
          changes.push(
            `Horaire : ${newStartTime || repetition.startTime}–${newEndTime || repetition.endTime}`,
          );
        if (newLocation) changes.push(`Lieu : ${newLocation}`);
        if (urgentMessage) changes.push(urgentMessage);

        const tokens = choristes.map((c) => c.fcmToken).filter(Boolean);
        if (tokens.length > 0) {
          await sendPushNotification({
            tokens,
            title: "⚠️ Répétition modifiée",
            body: `${dateStr} — ${changes.join(" · ")}`,
            data: {
              type: "repetition_updated",
              repetitionId: repetition._id.toString(),
            },
          });
        }

        for (const choriste of choristes) {
          const emailData = createManagerModificationTemplate({
            choristeFirstName: choriste.firstName,
            choristeLastName: choriste.lastName,
            choristerPupitre: choriste.pupitre,
            managerName: `${manager.firstName} ${manager.lastName}`,
            repetition,
            modifications: modificationData.modifications,
            originalValues: modificationData.originalValues,
          });
          await sendNotification({
            email: choriste.email,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            attachments: emailData.attachments,
          });
        }

        const freshRep = await Repetition.findById(repetition._id);
        const modToUpdate = freshRep.managerModifications.id(savedMod._id);
        if (modToUpdate) {
          modToUpdate.notificationsSent = true;
          await freshRep.save();
        }
      } catch (e) {
        console.error(
          "[modifyRepetitionForAllChoristes] Erreur notifications:",
          e,
        );
      }
    });
  } catch (error) {
    console.error("[modifyRepetitionForAllChoristes]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// RAPPORTS D'ABSENCES
// ─────────────────────────────────────────────────────────────

export const getManagerAbsenceReport = async (req, res) => {
  try {
    const { filterType, pupitre, choristeId } = req.query;

    if (!filterType || !VALID_FILTER_TYPES.includes(filterType)) {
      return res.status(400).json({
        message:
          "Type de filtre invalide. Options : " + VALID_FILTER_TYPES.join(", "),
      });
    }

    const { repetitionQuery, dateFilter } = buildDateFilters(
      filterType,
      req.query,
    );
    const finalQuery = { ...repetitionQuery, ...dateFilter };

    const repetitions = await Repetition.find(finalQuery)
      .populate("concert", "title")
      .populate("absentChoristes.choriste", "firstName lastName email pupitre")
      .populate("manualPresences.choriste", "firstName lastName email pupitre")
      .populate("manualPresences.addedBy", "firstName lastName")
      .sort({ date: -1 });

    if (!repetitions.length) {
      return res.json({
        filterType,
        filterValue: getFilterValue(req.query),
        period: getPeriodInfo(filterType, req.query),
        statistics: { totalRepetitions: 0, totalAbsences: 0, absenceRate: 0 },
        absenceRecords: [],
      });
    }

    let allRecords = [];

    for (const rep of repetitions) {
      for (const absent of rep.absentChoristes) {
        if (absent.choriste && rep.pupitres.includes(absent.choriste.pupitre)) {
          allRecords.push({
            _id: `${rep._id}_${absent.choriste._id}_auto`,
            choriste: {
              _id: absent.choriste._id,
              firstName: absent.choriste.firstName,
              lastName: absent.choriste.lastName,
              email: absent.choriste.email,
              pupitre: absent.choriste.pupitre,
            },
            repetition: {
              _id: rep._id,
              date: rep.date,
              startTime: rep.startTime,
              endTime: rep.endTime,
              location: rep.location,
              pupitres: rep.pupitres,
              concert: rep.concert,
            },
            reason: absent.reason,
            isManual: false,
            addedAt: rep.createdAt,
          });
        }
      }

      for (const manual of rep.manualPresences.filter(
        (m) => m.type === "absent",
      )) {
        if (manual.choriste && rep.pupitres.includes(manual.choriste.pupitre)) {
          allRecords.push({
            _id: `${rep._id}_${manual.choriste._id}_manual`,
            choriste: {
              _id: manual.choriste._id,
              firstName: manual.choriste.firstName,
              lastName: manual.choriste.lastName,
              email: manual.choriste.email,
              pupitre: manual.choriste.pupitre,
            },
            repetition: {
              _id: rep._id,
              date: rep.date,
              startTime: rep.startTime,
              endTime: rep.endTime,
              location: rep.location,
              pupitres: rep.pupitres,
              concert: rep.concert,
            },
            reason: manual.reason,
            isManual: true,
            addedBy: `${manual.addedBy.firstName} ${manual.addedBy.lastName}`,
            addedAt: manual.addedAt,
          });
        }
      }
    }

    let filtered = allRecords;
    if (filterType === "pupitre" && pupitre) {
      filtered = allRecords.filter((r) => r.choriste.pupitre === pupitre);
    } else if (filterType === "choriste" && choristeId) {
      filtered = allRecords.filter(
        (r) => r.choriste._id.toString() === choristeId,
      );
    }

    const totalAbsences = filtered.length;
    const uniqueChoristes = new Set(
      filtered.map((r) => r.choriste._id.toString()),
    ).size;
    const absenceRate =
      repetitions.length > 0
        ? (
            (totalAbsences / (repetitions.length * (uniqueChoristes || 1))) *
            100
          ).toFixed(1)
        : "0.0";

    let mostAbsentChoriste = null;
    if (filtered.length > 0) {
      const countById = {};
      for (const r of filtered) {
        const id = r.choriste._id.toString();
        countById[id] = (countById[id] || 0) + 1;
      }
      const maxAbsences = Math.max(...Object.values(countById));
      const topId = Object.keys(countById).find(
        (k) => countById[k] === maxAbsences,
      );
      const topRecord = filtered.find(
        (r) => r.choriste._id.toString() === topId,
      );
      if (topRecord) {
        mostAbsentChoriste = {
          name: `${topRecord.choriste.firstName} ${topRecord.choriste.lastName}`,
          absences: maxAbsences,
          pupitre: topRecord.choriste.pupitre,
        };
      }
    }

    filtered.sort(
      (a, b) => new Date(b.repetition.date) - new Date(a.repetition.date),
    );

    res.json({
      filterType,
      filterValue: getFilterValue(req.query),
      period: getPeriodInfo(filterType, req.query),
      statistics: {
        totalRepetitions: repetitions.length,
        totalAbsences,
        absenceRate: parseFloat(absenceRate),
        mostAbsentChoriste,
      },
      absenceRecords: filtered,
    });
  } catch (error) {
    console.error("[getManagerAbsenceReport]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getAttendanceForConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    const config = await Config.findOne();
    const threshold = config ? config.participationThreshold : 70;

    const repetitions = await Repetition.find({ concert: concertId });
    if (!repetitions.length) {
      return res
        .status(404)
        .json({ message: "Aucune répétition trouvée pour ce concert." });
    }

    const choristes = await User.find({
      role: "choriste",
      isLocked: { $ne: true },
    });

    const participation = choristes.map((choriste) => {
      let total = 0;
      let attended = 0;

      for (const rep of repetitions) {
        if (!rep.pupitres.includes(choriste.pupitre)) continue;
        total++;

        const isPresent = rep.presentChoristes.some(
          (p) => p.toString() === choriste._id.toString(),
        );
        const manualPres = rep.manualPresences.find(
          (m) =>
            m.choriste.toString() === choriste._id.toString() &&
            m.type === "present",
        );
        if (isPresent || manualPres) attended++;
      }

      const attendanceRate =
        total > 0 ? Math.round((attended / total) * 100) : 100;

      return {
        choristeId: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        email: choriste.email,
        pupitre: choriste.pupitre,
        totalRepetitions: total,
        attendedRepetitions: attended,
        attendanceRate,
      };
    });

    const relevant = participation.filter((p) => p.totalRepetitions > 0);

    res.json({
      threshold,
      participation: relevant,
      totalRepetitions: repetitions.length,
      stats: {
        totalChoristes: relevant.length,
        avgAttendanceRate:
          relevant.length > 0
            ? Math.round(
                relevant.reduce((s, p) => s + p.attendanceRate, 0) /
                  relevant.length,
              )
            : 0,
        pupitreBreakdown: VALID_PUPITRES.map((pupitre) => {
          const pp = relevant.filter((p) => p.pupitre === pupitre);
          const pr = repetitions.filter((r) => r.pupitres.includes(pupitre));
          return {
            pupitre,
            choristes: pp.length,
            repetitions: pr.length,
            avgAttendance:
              pp.length > 0
                ? Math.round(
                    pp.reduce((s, p) => s + p.attendanceRate, 0) / pp.length,
                  )
                : 0,
          };
        }),
      },
    });
  } catch (error) {
    console.error("[getAttendanceForConcert]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getComprehensiveAbsenceReport = async (req, res) => {
  try {
    const { filterType, pupitre, choristeId } = req.query;

    if (!filterType || !VALID_FILTER_TYPES.includes(filterType)) {
      return res.status(400).json({
        message:
          "Type de filtre invalide. Options : " + VALID_FILTER_TYPES.join(", "),
      });
    }

    const { repetitionQuery, dateFilter } = buildDateFilters(
      filterType,
      req.query,
    );

    let concertDateFilter = {};
    if (dateFilter.date) {
      const mapped = {};
      if (dateFilter.date.$gte) mapped.$gte = dateFilter.date.$gte;
      if (dateFilter.date.$lt) mapped.$lt = dateFilter.date.$lt;
      if (dateFilter.date.$lte) mapped.$lte = dateFilter.date.$lte;
      concertDateFilter = { dateHeure: mapped };
    }

    const userFilter = {
      role: "choriste",
      isLocked: { $ne: true },
      ...(filterType === "pupitre" && pupitre ? { pupitre } : {}),
      ...(filterType === "choriste" && choristeId ? { _id: choristeId } : {}),
    };

    const [repetitions, concerts, choristes, config] = await Promise.all([
      Repetition.find({ ...repetitionQuery, ...dateFilter })
        .populate("concert", "title")
        .populate("presentChoristes", "_id pupitre")
        .populate("absentChoristes.choriste", "_id pupitre")
        .populate("manualPresences.choriste", "_id pupitre")
        .sort({ date: 1 }),
      Concert.find(concertDateFilter)
        .populate("finalParticipants", "_id")
        .populate("availableChoristes", "_id")
        .populate("absentChoristes.choriste", "_id")
        .sort({ dateHeure: 1 }),
      User.find(userFilter).select(
        "firstName lastName email pupitre eliminationRecords",
      ),
      Config.findOne(),
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
          threshold,
        },
        choristesData: [],
      });
    }

    const choristesData = choristes.map((choriste) => {
      const relevantReps = repetitions.filter((r) =>
        r.pupitres.includes(choriste.pupitre),
      );
      let attendedReps = 0;
      const repetitionAbsences = [];

      for (const rep of relevantReps) {
        let isPresent = rep.presentChoristes.some(
          (p) => p._id.toString() === choriste._id.toString(),
        );
        let absenceReason = null;

        const autoAbsent = rep.absentChoristes.find(
          (a) => a.choriste._id.toString() === choriste._id.toString(),
        );
        if (autoAbsent) {
          isPresent = false;
          absenceReason = autoAbsent.reason;
        }

        const manual = rep.manualPresences.find(
          (m) => m.choriste._id.toString() === choriste._id.toString(),
        );
        if (manual) {
          isPresent = manual.type === "present";
          if (!isPresent) absenceReason = manual.reason;
        }

        if (isPresent) {
          attendedReps++;
        } else {
          repetitionAbsences.push({
            repetitionId: rep._id,
            date: rep.date,
            location: rep.location,
            concertTitle: rep.concert?.title || "Concert non défini",
            pupitres: rep.pupitres,
            reason: absenceReason || "Non marqué présent",
            isManual: !!manual,
          });
        }
      }

      const repRate =
        relevantReps.length > 0
          ? (attendedReps / relevantReps.length) * 100
          : 100;

      let validatedConcerts = 0;
      const concertAbsences = [];

      for (const concert of concerts) {
        const isValidated = concert.finalParticipants.some(
          (p) => p._id.toString() === choriste._id.toString(),
        );
        const hasMarked = concert.availableChoristes.some(
          (a) => a._id.toString() === choriste._id.toString(),
        );
        const absentRecord = concert.absentChoristes.find(
          (a) => a.choriste._id.toString() === choriste._id.toString(),
        );
        const isEliminated = choriste.eliminationRecords?.some(
          (r) => r.concertId?.toString() === concert._id.toString(),
        );

        if (isValidated && !isEliminated) {
          validatedConcerts++;
        } else {
          let reason = "N'a pas marqué sa disponibilité";
          if (isEliminated) reason = "Éliminé";
          else if (absentRecord)
            reason = getAbsenceReasonMessage(absentRecord.reason);
          else if (hasMarked && !isValidated)
            reason = "Disponible mais non validé";

          concertAbsences.push({
            concertId: concert._id,
            title: concert.title,
            dateHeure: concert.dateHeure,
            reason,
            markedAt: absentRecord?.markedAt || null,
          });
        }
      }

      const concertRate =
        concerts.length > 0 ? (validatedConcerts / concerts.length) * 100 : 0;

      return {
        choriste: {
          _id: choriste._id,
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          email: choriste.email,
          pupitre: choriste.pupitre,
        },
        repetitionStats: {
          totalRepetitions: relevantReps.length,
          attendedRepetitions: attendedReps,
          attendanceRate: Math.round(repRate * 10) / 10,
          absencesCount: relevantReps.length - attendedReps,
          allRepetitionsCount: repetitions.length,
          pupitreSpecificNote:
            relevantReps.length < repetitions.length
              ? `Seules les ${relevantReps.length} répétitions de votre pupitre (${choriste.pupitre}) sont comptabilisées.`
              : null,
        },
        concertStats: {
          totalConcerts: concerts.length,
          availableConcerts: validatedConcerts,
          attendanceRate: Math.round(concertRate * 10) / 10,
          absencesCount: concerts.length - validatedConcerts,
        },
        repetitionAbsences,
        concertAbsences,
        overallAttendanceRate:
          Math.round(((repRate + concertRate) / 2) * 10) / 10,
        isAtRisk: repRate < threshold || concertRate < threshold,
      };
    });

    choristesData.sort((a, b) => {
      const aAvg =
        (a.repetitionStats.attendanceRate + a.concertStats.attendanceRate) / 2;
      const bAvg =
        (b.repetitionStats.attendanceRate + b.concertStats.attendanceRate) / 2;
      return aAvg - bAvg;
    });

    const totalRepAbs = choristesData.reduce(
      (s, c) => s + c.repetitionStats.absencesCount,
      0,
    );
    const totalConcertAbs = choristesData.reduce(
      (s, c) => s + c.concertStats.absencesCount,
      0,
    );
    const avgRepRate =
      choristesData.reduce((s, c) => s + c.repetitionStats.attendanceRate, 0) /
      (choristesData.length || 1);
    const avgConcertRate =
      choristesData.reduce((s, c) => s + c.concertStats.attendanceRate, 0) /
      (choristesData.length || 1);
    const atRiskCount = choristesData.filter((c) => c.isAtRisk).length;

    res.json({
      filterType,
      filterValue: getFilterValue(req.query),
      period: getPeriodInfo(filterType, req.query),
      statistics: {
        totalChoristes: choristes.length,
        totalRepetitions: repetitions.length,
        totalConcerts: concerts.length,
        totalRepetitionAbsences: totalRepAbs,
        totalConcertAbsences: totalConcertAbs,
        avgRepetitionAttendanceRate: Math.round(avgRepRate * 10) / 10,
        avgConcertAttendanceRate: Math.round(avgConcertRate * 10) / 10,
        atRiskCount,
        threshold,
      },
      choristesData,
    });
  } catch (error) {
    console.error("[getComprehensiveAbsenceReport]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
