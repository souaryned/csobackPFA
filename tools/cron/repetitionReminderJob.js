import cron from "node-cron";
import User from "../../models/userModel.js";
import Repetition from "../../models/repetitionModel.js";
import { sendNotification } from "../mail/mailNotif.js";
import { reminderRepetitionTemplateGrouped } from "../mail/notifTemplate.js";
import { sendPushNotification } from "../push/fcmService.js"; // ✅ AJOUT

const loadChoralUsers = async () => {
  return await User.find({
    role: "choriste",
    email: { $exists: true, $ne: "" },
  });
};

export const scheduleRepetitionReminders = () => {

  // 🔔 1. Rappel J-1 (20h00)
  cron.schedule("0 20 * * *", async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(tomorrow.getDate() + 1);

    try {
      const repetitions = await Repetition.find({ notifiedDayBefore: { $ne: true } });
      const dayBeforeReps = repetitions.filter(rep => {
        const [h, m] = rep.startTime.split(":").map(Number);
        const start = new Date(rep.date);
        start.setHours(h, m, 0, 0);
        return start >= tomorrow && start < nextDay;
      });

      if (!dayBeforeReps.length) return;

      const choristes = await loadChoralUsers();

      for (const choriste of choristes) {
        const relevantReps = dayBeforeReps.filter(rep =>
          rep.pupitres && rep.pupitres.includes(choriste.pupitre)
        );

        if (relevantReps.length > 0) {
          // ✅ Email (existant)
          const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(choriste, relevantReps);
          await sendNotification({
            email: choriste.email,
            subject,
            htmlContent,
            attachments,
          });

          // ✅ Push notification (AJOUT)
          if (choriste.fcmToken) {
            const rep = relevantReps[0];
            await sendPushNotification({
              tokens: [choriste.fcmToken],
              title: '⏰ Rappel — Répétition demain',
              body: `Demain à ${rep.startTime} — ${rep.location}. Pensez à marquer votre présence !`,
              data: {
                type: 'reminder_day_before',
                repetitionId: rep._id.toString(),
              },
            });
          }
        }
      }

      for (const rep of dayBeforeReps) {
        rep.notifiedDayBefore = true;
        await rep.save();
      }

    } catch (err) {
      console.error("❌ Erreur [cron 20h]:", err);
    }
  }, { timezone: "Africa/Tunis" });


  // 🔔 2. Rappel 2h avant (toutes les 15 min)
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();

    try {
      const repetitions = await Repetition.find({ notifiedTwoHoursBefore: { $ne: true } });
      const twoHourReps = repetitions.filter(rep => {
        const [h, m] = rep.startTime.split(":").map(Number);
        const start = new Date(rep.date);
        start.setHours(h, m, 0, 0);
        const diffInMin = (start - now) / 60000;
        return diffInMin >= 115 && diffInMin <= 125;
      });

      if (!twoHourReps.length) return;

      const choristes = await loadChoralUsers();

      for (const choriste of choristes) {
        const relevantReps = twoHourReps.filter(rep =>
          rep.pupitres && rep.pupitres.includes(choriste.pupitre)
        );

        if (relevantReps.length > 0) {
          // ✅ Email (existant)
          const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(choriste, relevantReps);
          await sendNotification({
            email: choriste.email,
            subject,
            htmlContent,
            attachments,
          });

          // ✅ Push notification (AJOUT)
          if (choriste.fcmToken) {
            const rep = relevantReps[0];
            await sendPushNotification({
              tokens: [choriste.fcmToken],
              title: '🔔 Répétition dans 2h',
              body: `À ${rep.startTime} — ${rep.location}. N'oubliez pas de marquer votre présence !`,
              data: {
                type: 'reminder_2h',
                repetitionId: rep._id.toString(),
              },
            });
          }
        }
      }

      for (const rep of twoHourReps) {
        rep.notifiedTwoHoursBefore = true;
        await rep.save();
      }

    } catch (err) {
      console.error("❌ Erreur [cron -2h]:", err);
    }
  }, { timezone: "Africa/Tunis" });

  // 🔔 3. Rappel 10 minutes avant (toutes les minutes)
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      const repetitions = await Repetition.find({ notifiedTenMinutesBefore: { $ne: true } });

      const tenMinReps = repetitions.filter(rep => {
        const [h, m] = rep.startTime.split(":").map(Number);
        const start = new Date(rep.date);
        start.setHours(h, m, 0, 0);
        const diffInMin = (start - now) / 60000;
        // Fenêtre : entre 9 et 11 minutes avant
        return diffInMin >= 9 && diffInMin <= 11;
      });

      if (!tenMinReps.length) return;

      for (const rep of tenMinReps) {
        // Récupérer les choristes concernés avec fcmToken
        const choristes = await User.find({
          role: 'choriste',
          isLocked: false,
          pupitre: { $in: rep.pupitres },
          fcmToken: { $ne: null },
        }).select('fcmToken firstName');

        const tokens = choristes.map(c => c.fcmToken).filter(Boolean);
        if (tokens.length === 0) continue;

        const dateStr = new Date(rep.date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });

        await sendPushNotification({
          tokens,
          title: '⏰ Répétition dans 10 minutes !',
          body: `La répétition commence à ${rep.startTime} — ${rep.location}. Préparez-vous !`,
          data: {
            type: 'reminder_10min',
            repetitionId: rep._id.toString(),
          },
        });

        rep.notifiedTenMinutesBefore = true;
        await rep.save();

        console.log(`[CRON] ✅ Notif 10min envoyée — répétition ${rep._id} à ${rep.startTime}`);
      }
    } catch (err) {
      console.error("❌ Erreur [cron -10min]:", err);
    }
  }, { timezone: "Africa/Tunis" });

  console.log('[CRON] Rappels répétitions programmés ✅');
};