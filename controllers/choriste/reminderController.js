// controllers/choriste/reminderController.js

import Repetition from "../../models/repetitionModel.js";
import mongoose from "mongoose";

const getRepDateTime = (rep) => {
  const d = new Date(rep.date);
  const [h, m] = rep.startTime.split(":").map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
};

// ─────────────────────────────────────────────────────────────
// GET /choriste/repetitions/my-reminders
//
// CORRECTIONS :
//  1. Suppression du filtre `date: { $gte: today }` qui excluait
//     des répétitions valides selon le fuseau horaire serveur.
//     On filtre maintenant APRÈS récupération, côté JS, sur la
//     date/heure réelle de début (getRepDateTime).
//  2. Comparaison userId robuste : on accepte ObjectId ET string.
//  3. On retourne TOUJOURS un objet JSON valide, jamais null/liste.
// ─────────────────────────────────────────────────────────────
export const getAllMyReminders = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // ✅ Convertir en ObjectId pour la query Mongo
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch {
      return res.json({});
    }

    const now = new Date();

    // ✅ FIX 1 : On retire le filtre `date: { $gte: today }` de la query Mongo.
    // Raison : le champ `date` est stocké en UTC (minuit), ce qui peut exclure
    // des répétitions futures selon le fuseau du serveur.
    // On récupère toutes les répétitions de l'utilisateur et on filtre
    // côté JS sur la date/heure RÉELLE de fin de répétition.
    const reps = await Repetition.find({
      "choristeReminders.choriste": userObjectId,
    }).select("_id choristeReminders date startTime endTime");

    const result = {};

    for (const rep of reps) {
      // ✅ FIX 2 : Calculer l'heure de FIN réelle de la répétition
      // On n'affiche que les rappels des répétitions qui ne sont pas encore terminées
      let repEndDateTime;
      try {
        const d = new Date(rep.date);
        const endTime = rep.endTime || rep.startTime || "23:59";
        const [endH, endM] = endTime.split(":").map(Number);
        repEndDateTime = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          endH,
          endM,
          0,
          0,
        );
      } catch {
        // Si on ne peut pas parser, on garde la répétition
        repEndDateTime = new Date(Date.now() + 1000);
      }

      // Ignorer les répétitions déjà terminées
      if (repEndDateTime <= now) continue;

      // ✅ FIX 3 : Filtrer les rappels de CET utilisateur, non envoyés
      // Comparaison robuste : ObjectId.toString() === userId (string)
      const myEntries = rep.choristeReminders.filter(
        (r) => r.choriste.toString() === userId.toString() && !r.sent,
      );

      if (myEntries.length > 0) {
        result[rep._id.toString()] = myEntries.map((e) => e.minutesBefore);
      }
    }

    // ✅ Toujours retourner un objet JSON valide
    res.json(result);
  } catch (err) {
    console.error("[getAllMyReminders]", err);
    res.json({});
  }
};

// ─────────────────────────────────────────────────────────────
// GET /choriste/repetitions/:repId/reminder
// Retourne { minutesList: [...], sentList: [...] }
// ─────────────────────────────────────────────────────────────
export const getMyReminder = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { repId } = req.params;

    const rep = await Repetition.findById(repId).select(
      "choristeReminders date startTime",
    );
    if (!rep)
      return res.status(404).json({ message: "Répétition introuvable." });

    const myEntries =
      rep.choristeReminders?.filter(
        (r) => r.choriste.toString() === userId.toString(),
      ) ?? [];

    res.json({
      minutesList: myEntries.filter((e) => !e.sent).map((e) => e.minutesBefore),
      sentList: myEntries.filter((e) => e.sent).map((e) => e.minutesBefore),
    });
  } catch (err) {
    console.error("[getMyReminder]", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /choriste/repetitions/:repId/reminder
// Body: { minutesBefore: number }
// ─────────────────────────────────────────────────────────────
export const addMyReminder = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { repId } = req.params;
    const { minutesBefore } = req.body;

    if (typeof minutesBefore !== "number" || minutesBefore < 1) {
      return res.status(400).json({
        message:
          "minutesBefore doit être un nombre positif (minimum 1 minute).",
      });
    }

    const rep = await Repetition.findById(repId);
    if (!rep)
      return res.status(404).json({ message: "Répétition introuvable." });

    const repDT = getRepDateTime(rep);
    if (repDT <= new Date())
      return res
        .status(400)
        .json({ message: "Cette répétition est déjà passée." });

    const reminderDT = new Date(repDT.getTime() - minutesBefore * 60_000);
    if (reminderDT <= new Date())
      return res.status(400).json({
        message: "Le délai choisi est déjà dépassé pour cette répétition.",
      });

    if (!rep.choristeReminders) rep.choristeReminders = [];

    const alreadyExists = rep.choristeReminders.some(
      (r) =>
        r.choriste.toString() === userId.toString() &&
        r.minutesBefore === minutesBefore &&
        !r.sent,
    );
    if (alreadyExists)
      return res
        .status(409)
        .json({ message: "Un rappel avec ce délai existe déjà." });

    rep.choristeReminders.push({
      choriste: userId,
      minutesBefore,
      sent: false,
      sentAt: null,
    });

    await rep.save();
    res.json({ message: "Rappel ajouté.", minutesBefore });
  } catch (err) {
    console.error("[addMyReminder]", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /choriste/repetitions/:repId/reminder/:minutes
// ─────────────────────────────────────────────────────────────
export const deleteMyReminder = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { repId, minutes } = req.params;
    const minutesBefore = parseInt(minutes, 10);

    if (isNaN(minutesBefore))
      return res.status(400).json({ message: "Délai invalide." });

    const rep = await Repetition.findById(repId);
    if (!rep)
      return res.status(404).json({ message: "Répétition introuvable." });

    const before = rep.choristeReminders.length;
    rep.choristeReminders = rep.choristeReminders.filter(
      (r) =>
        !(
          r.choriste.toString() === userId.toString() &&
          r.minutesBefore === minutesBefore &&
          !r.sent
        ),
    );

    if (rep.choristeReminders.length === before)
      return res.status(404).json({ message: "Rappel introuvable." });

    await rep.save();
    res.json({ message: "Rappel supprimé.", minutesBefore });
  } catch (err) {
    console.error("[deleteMyReminder]", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /choriste/repetitions/:repId/reminders
// ─────────────────────────────────────────────────────────────
export const deleteAllMyReminders = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { repId } = req.params;

    const rep = await Repetition.findById(repId);
    if (!rep)
      return res.status(404).json({ message: "Répétition introuvable." });

    rep.choristeReminders = rep.choristeReminders.filter(
      (r) => !(r.choriste.toString() === userId.toString() && !r.sent),
    );

    await rep.save();
    res.json({ message: "Tous les rappels supprimés." });
  } catch (err) {
    console.error("[deleteAllMyReminders]", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /choriste/repetitions/:repId/reminder  (compat legacy)
// Body: { minutesBefore: number | null }
// ─────────────────────────────────────────────────────────────
export const setMyReminder = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { repId } = req.params;
    const { minutesBefore } = req.body;

    const rep = await Repetition.findById(repId);
    if (!rep)
      return res.status(404).json({ message: "Répétition introuvable." });

    const repDT = getRepDateTime(rep);
    if (repDT <= new Date())
      return res
        .status(400)
        .json({ message: "Cette répétition est déjà passée." });

    if (!rep.choristeReminders) rep.choristeReminders = [];

    // Supprimer tous les rappels non envoyés de cet utilisateur
    rep.choristeReminders = rep.choristeReminders.filter(
      (r) => !(r.choriste.toString() === userId.toString() && !r.sent),
    );

    if (minutesBefore !== null && minutesBefore !== undefined) {
      if (typeof minutesBefore !== "number" || minutesBefore < 1)
        return res.status(400).json({
          message:
            "minutesBefore doit être un nombre positif (minimum 1 minute).",
        });

      const reminderDT = new Date(repDT.getTime() - minutesBefore * 60_000);
      if (reminderDT <= new Date())
        return res.status(400).json({
          message: "Le délai choisi est déjà dépassé pour cette répétition.",
        });

      rep.choristeReminders.push({
        choriste: userId,
        minutesBefore,
        sent: false,
        sentAt: null,
      });
    }

    await rep.save();
    res.json({
      message:
        minutesBefore == null ? "Rappel(s) supprimé(s)." : "Rappel enregistré.",
      minutesBefore: minutesBefore ?? null,
    });
  } catch (err) {
    console.error("[setMyReminder]", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
