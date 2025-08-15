// tools/cron/autoDeleteExpiredConvocations.js - Fix the export
import cron from 'node-cron';
import User from '../../models/userModel.js';
import AuditionSlot from '../../models/auditionSlotModel.js';

// Helper function
const handleConvocationDecline = async (candidateId) => {
  await Promise.all([
    AuditionSlot.deleteMany({ candidate: candidateId }),
    User.findByIdAndDelete(candidateId)
  ]);
};

// 🎯 Run every hour to auto-delete expired non-responsive candidates
const autoDeleteExpiredConvocations = cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔄 Auto-cleanup: Checking for expired convocations...');
    
    const expiredCandidates = await User.find({
      role: 'candidate',
      memberstatus: 'TestScheduled',
      convocationStatus: 'Sent', // Never responded
      convocationDeadline: { $lt: new Date() }
    });

    if (expiredCandidates.length > 0) {
      console.log(`🗑️ Auto-deleting ${expiredCandidates.length} expired candidates`);
      
      for (const candidate of expiredCandidates) {
        await handleConvocationDecline(candidate._id);
        console.log(`🗑️ Auto-deleted: ${candidate.firstName} ${candidate.lastName}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in auto-delete cron job:', error);
  }
}, {
  scheduled: false
});

// 🎯 FIX: Export as default (not named export)
export default autoDeleteExpiredConvocations;