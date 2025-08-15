import cron from 'node-cron';
import User from '../../models/userModel.js';

export const startUserCleanupJob = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      // 1. Delete unconfirmed users with expired tokens
      const unconfirmed = await User.deleteMany({
        emailConfirmed: false,
        emailConfirmationTokenExpires: { $lt: new Date() }
      });

      // 2. Delete confirmed users who didn't complete the form after 1h
      const confirmedAbandoned = await User.deleteMany({
        emailConfirmed: true,
        emailConfirmationTokenExpires: { $lt: new Date() },
        memberstatus: { $exists: false }, // or: { $ne: "Pending" }
        // firstName: "En attente" // Optional: tighten condition
      });

      if (unconfirmed.deletedCount > 0 || confirmedAbandoned.deletedCount > 0) {
        // console.log(`[CRON] Deleted ${unconfirmed.deletedCount} unconfirmed + ${confirmedAbandoned.deletedCount} abandoned users.`);
      }
    } catch (err) {
      console.error('[CRON] Cleanup error:', err);
    }
  });
};
