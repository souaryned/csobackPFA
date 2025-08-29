import cron from 'node-cron';
import { processReminderSystem } from '../../controllers/convocationController.js'; // ✅ FIXED .js extension

// Run every hour to check for reminders and expired auditions
export const startReminderSystem = () => {
  cron.schedule('0 * * * *', async () => { // Every hour
    try {
      await processReminderSystem();
    } catch (error) {
      console.error('🚨 Reminder system failed:', error);
    }
  });
  
  // console.log('🔔 Reminder system started (runs every hour)');
};