import cron from "node-cron";
import User from "../../models/userModel.js";
import Repetition from "../../models/repetitionModel.js";
import { sendNotification } from "../mail/mailNotif.js";
import { reminderRepetitionTemplateGrouped } from "../mail/notifTemplate.js";

// Utility to get users
const loadChoralUsers = async () => {
  return await User.find({
    role: { $in: ["choriste", "manager", "chef de choeur"] },
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
      const [h, m] = rep.startTime.split(":" ).map(Number);
      const start = new Date(rep.date);
      start.setHours(h, m, 0, 0);
      return start >= tomorrow && start < nextDay;
    });

    if (!dayBeforeReps.length) return;

    const users = await loadChoralUsers();

    for (const user of users) {
      const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(user, dayBeforeReps);
      await sendNotification({
        email: user.email,
        subject,
        htmlContent,
        attachments,
      });
    }

    // Mark notified
    for (const rep of dayBeforeReps) {
      rep.notifiedDayBefore = true;
      await rep.save();
    }

    console.log(`[CRON 20h] Envoyé jour-avant: ${dayBeforeReps.length} répétition(s)`);
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
      const [h, m] = rep.startTime.split(":" ).map(Number);
      const start = new Date(rep.date);
      start.setHours(h, m, 0, 0);
      const diffInMin = (start - now) / 60000;
      return diffInMin >= 115 && diffInMin <= 125;
    });

    if (!twoHourReps.length) return;

    const users = await loadChoralUsers();

    for (const user of users) {
      const { subject, htmlContent, attachments } = reminderRepetitionTemplateGrouped(user, twoHourReps);
      await sendNotification({
        email: user.email,
        subject,
        htmlContent,
        attachments,
      });
    }

    // Mark notified
    for (const rep of twoHourReps) {
      rep.notifiedTwoHoursBefore = true;
      await rep.save();
    }

    console.log(`[CRON -2h] Envoyé pour: ${twoHourReps.length} répétition(s)`);
  } catch (err) {
    console.error("❌ Erreur [cron -2h]:", err);
  }
}, {
  timezone: "Africa/Tunis"
});
};




// export const scheduleRepetitionReminders = () => {
//   cron.schedule("* * * * *", async () => {

//     const now = new Date();
//     // const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000); // removed

//     try {
//       // 1. Find all repetitions today or later
//       const repetitions = await Repetition.find({
//         date: { $gte: now.toISOString().split("T")[0] },
//       });

//       // 2. **No more 6h filter** — just take everything
//       const upcomingRepetitions = repetitions;

//       if (upcomingRepetitions.length === 0) return;

//       // 3. Fetch users
//       const users = await User.find({
//         role: { $in: ["choriste", "manager", "chef de choeur"] },
//       });

//       // 4. For each user, send grouped email if at least 1 repetition
//       for (const user of users) {
//         if (!user.email) continue;

//         const { subject, htmlContent, attachments } =
//           reminderRepetitionTemplateGrouped(user, upcomingRepetitions);

//         await sendNotification({
//           email: user.email,
//           subject,
//           htmlContent,
//           attachments,
//         });
//       }

//       console.log(
//         `[Cron] Grouped reminder sent to ${users.length} users for ${upcomingRepetitions.length} repetitions`
//       );
//     } catch (err) {
//       console.error("❌ Error in grouped repetition reminder:", err);
//     }
//   });
// };
