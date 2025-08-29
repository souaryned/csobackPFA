import cron from "node-cron";
import User from "../../models/userModel.js";
import Repetition from "../../models/repetitionModel.js";
import { sendNotification } from "../mail/mailNotif.js";
import { reminderRepetitionTemplateGrouped } from "../mail/notifTemplate.js";

// ✅ UPDATED: Only load choristes
const loadChoralUsers = async () => {
  return await User.find({
    role: "choriste", // ✅ Only choristes
    email: { $exists: true, $ne: "" },
  });
};

export const scheduleRepetitionReminders = () => {
  // Fires every day at 08:00 and 20:00
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

      const choristes = await loadChoralUsers(); // ✅ Only choristes

      for (const choriste of choristes) {
        // ✅ Filter repetitions by choriste's pupitre
        const relevantReps = dayBeforeReps.filter(rep => 
          rep.pupitres && rep.pupitres.includes(choriste.pupitre)
        );

        // Only send email if there are relevant repetitions for this choriste
        if (relevantReps.length > 0) {
          const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(choriste, relevantReps);
          await sendNotification({
            email: choriste.email,
            subject,
            htmlContent,
            attachments,
          });
        }
      }

      // Mark notified
      for (const rep of dayBeforeReps) {
        rep.notifiedDayBefore = true;
        await rep.save();
      }

      // console.log(`[CRON 20h] Envoyé jour-avant: ${dayBeforeReps.length} répétition(s)`);
    } catch (err) {
      console.error("❌ Erreur [cron 20h]:", err);
    }
  }, {
    timezone: "Africa/Tunis"
  });

  // 🔔 2. Two-hours-before reminder (runs every 15 min)
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

      const choristes = await loadChoralUsers(); // ✅ Only choristes

      for (const choriste of choristes) {
        // ✅ Filter repetitions by choriste's pupitre
        const relevantReps = twoHourReps.filter(rep => 
          rep.pupitres && rep.pupitres.includes(choriste.pupitre)
        );

        // Only send email if there are relevant repetitions for this choriste
        if (relevantReps.length > 0) {
          const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(choriste, relevantReps);
          await sendNotification({
            email: choriste.email,
            subject,
            htmlContent,
            attachments,
          });
        }
      }

      // Mark notified
      for (const rep of twoHourReps) {
        rep.notifiedTwoHoursBefore = true;
        await rep.save();
      }

      // console.log(`[CRON -2h] Envoyé pour: ${twoHourReps.length} répétition(s)`);
    } catch (err) {
      console.error("❌ Erreur [cron -2h]:", err);
    }
  }, {
    timezone: "Africa/Tunis"
  });
};