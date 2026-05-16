// tools/cron/reminderCron.js

import cron from "node-cron";
import Repetition from "../models/repetitionModel.js";
import { sendPushNotification } from "./push/fcmService.js";
import User from "../models/userModel.js";

console.log(
  "⏰ [Cron] Reminder personnalisé lancé — vérification toutes les minutes.",
);

// ─────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────

const getRepDateTime = (rep) => {
  const d = new Date(rep.date);
  const [h, m] = rep.startTime.split(":").map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
};

const formatDateFr = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

// Label lisible : 90 → "1h30", 1440 → "la veille", 10 → "10 min"
const formatMinutes = (min) => {
  if (min >= 1440) {
    const days = Math.floor(min / 1440);
    return days === 1 ? "la veille" : `${days} jours avant`;
  }
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h${m}`;
  }
  return `${min} min`;
};

// Titre de notification selon le délai
const buildNotifTitle = (minutesBefore) => {
  if (minutesBefore >= 1440) return "📅 Rappel répétition — demain";
  if (minutesBefore >= 60)
    return `⏰ Rappel répétition — dans ${formatMinutes(minutesBefore)}`;
  return `🚨 Rappel répétition — dans ${formatMinutes(minutesBefore)}`;
};

// ─────────────────────────────────────────────────────────────
// Cron — toutes les minutes
// Logique : pour chaque répétition future, on parcourt les
// choristeReminders non envoyés. Si le moment du rappel est
// dans la fenêtre [now-1min, now+1min], on envoie la notif.
// ─────────────────────────────────────────────────────────────
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  try {
    // Charger toutes les répétitions futures avec des rappels non envoyés
    const repetitions = await Repetition.find({
      date: { $gte: today },
      choristeReminders: {
        $elemMatch: { sent: false },
      },
    });

    if (repetitions.length === 0) return;

    for (const rep of repetitions) {
      const repDT = getRepDateTime(rep);

      // Ignorer les répétitions déjà commencées
      if (repDT <= now) continue;

      const dateStr = formatDateFr(rep.date);
      const toMarkSent = []; // _id des entries à marquer comme envoyées

      // Collecter les choriste IDs à notifier pour charger leurs tokens
      const pendingEntries = rep.choristeReminders.filter((e) => !e.sent);
      if (pendingEntries.length === 0) continue;

      // Charger les tokens FCM des choristes concernés en une seule requête
      const choristeIds = pendingEntries.map((e) => e.choriste);
      const choristes = await User.find({
        _id: { $in: choristeIds },
        isLocked: { $ne: true },
        fcmToken: { $ne: null },
      }).select("_id fcmToken");

      const tokenMap = {};
      for (const c of choristes) {
        tokenMap[c._id.toString()] = c.fcmToken;
      }

      for (const entry of pendingEntries) {
        const fcmToken = tokenMap[entry.choriste.toString()];
        if (!fcmToken) continue; // pas de token → skip

        const mb = entry.minutesBefore;

        // Moment prévu du rappel
        const reminderDT = new Date(repDT.getTime() - mb * 60_000);

        // Fenêtre de déclenchement : ±1 minute autour du moment prévu
        // (le cron tourne toutes les minutes, donc ±1 min = toujours déclenché)
        const diffMs = reminderDT.getTime() - now.getTime();
        const diffMin = diffMs / 60_000;

        if (diffMin <= 1 && diffMin > -1) {
          // ✅ C'est le moment d'envoyer ce rappel !
          try {
            await sendPushNotification({
              tokens: [fcmToken],
              title: buildNotifTitle(mb),
              body: `${dateStr} à ${rep.startTime}${rep.location ? ` — ${rep.location}` : ""}`,
              data: {
                type: "reminder_custom",
                repetitionId: rep._id.toString(),
                minutesBefore: String(mb),
              },
            });

            toMarkSent.push(entry._id);

            console.log(
              `[Cron] ✅ Reminder "${formatMinutes(mb)}" envoyé` +
                ` → choriste ${entry.choriste} | répétition ${rep._id} (${rep.startTime})`,
            );
          } catch (err) {
            console.error(
              `[Cron] ❌ Échec reminder → choriste ${entry.choriste}:`,
              err.message,
            );
          }
        }
      }

      // ── Marquer les rappels envoyés de façon atomique ──────────
      if (toMarkSent.length > 0) {
        await Repetition.updateOne(
          { _id: rep._id },
          {
            $set: {
              "choristeReminders.$[elem].sent": true,
              "choristeReminders.$[elem].sentAt": now,
            },
          },
          {
            arrayFilters: [{ "elem._id": { $in: toMarkSent } }],
          },
        );
      }
    }
  } catch (err) {
    console.error("[Cron] ❌ Erreur globale reminder:", err);
  }
});
