// controllers/convocationController.js
import User from '../models/userModel.js';
import AuditionSlot from '../models/auditionSlotModel.js';
import AuditionParams from '../models/auditionParamsModel.js';
import { sendNotification } from "../tools/mail/mailNotif.js";
import { createReminderEmailTemplate } from "../tools/mail/notifTemplate.js"

// Helper function: Complete candidate deletion
const handleConvocationDecline = async (candidateId) => {
  try {
    // Delete from all related collections
    await Promise.all([
      AuditionSlot.deleteMany({ candidate: candidateId }),
      User.findByIdAndDelete(candidateId)
      // Add other collections if needed (applications, documents, etc.)
    ]);
    
    // console.log(`✅ Candidate ${candidateId} completely removed from system`);
  } catch (error) {
    console.error('❌ Error deleting candidate:', error);
    throw error;
  }
};

// GET: Display convocation response page
export const getConvocationResponse = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.role !== 'candidate') {
      return res.status(404).json({ message: "Candidat introuvable." });
    }

    // Get audition slot
    const auditionSlot = await AuditionSlot.findOne({ candidate: candidateId });

    // 🎯 HANDLE ALL CONVOCATION STATUSES (48h deadline logic REMOVED)
    switch (candidate.convocationStatus) {
      case 'Sent':
        // Still pending response (no deadline check)
        return res.status(200).json({
          status: 'pending_response',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: auditionSlot ? {
            date: auditionSlot.date,
            startTime: auditionSlot.startTime,
            endTime: auditionSlot.endTime
          } : null,
          message: "Veuillez confirmer votre présence."
        });

      case 'Confirmed':
        // ✅ ALREADY CONFIRMED
        return res.status(200).json({
          status: 'confirmed',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: auditionSlot ? {
            date: auditionSlot.date,
            startTime: auditionSlot.startTime,
            endTime: auditionSlot.endTime
          } : null,
          message: "Votre présence a été confirmée avec succès!"
        });

      case 'Declined':
        // ❌ ALREADY DECLINED
        return res.status(200).json({
          status: 'declined',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: null,
          message: "Votre candidature a été déclinée et supprimée du système."
        });

      case 'RescheduleRequested':
        // 🔄 RESCHEDULE DIFFERENT DAY REQUESTED
        return res.status(200).json({
          status: 'rescheduled_different_day',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: null,
          message: "Votre demande de changement de jour a été enregistrée. Nous vous contacterons bientôt avec un nouveau créneau."
        });

      case 'RescheduledSameDay':
        // 🎯 NEW: SAME DAY RESCHEDULE PENDING APPROVAL
        return res.status(200).json({
          status: 'rescheduled_same_day_pending',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: auditionSlot ? {
            date: auditionSlot.date,
            startTime: auditionSlot.startTime,
            endTime: auditionSlot.endTime
          } : null,
          requestedNewTime: candidate.requestedNewTime,
          message: "Votre demande de nouveau créneau est en cours de traitement. Vous serez contacté bientôt."
        });

      case 'Expired':
        // 🔄 MOVED TO PENDING (after 24h on audition day)
        return res.status(200).json({
          status: 'expired_moved_pending',
          candidate: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email
          },
          auditionSlot: null,
          message: "Votre convocation a expiré et vous avez été remis en liste d'attente pour une prochaine session."
        });

      default:
        return res.status(400).json({
          status: 'error',
          message: "Statut de convocation invalide."
        });
    }

  } catch (error) {
    console.error('Error fetching convocation response:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// POST: Handle convocation response
export const handleConvocationResponse = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { action, reason, rescheduleType, newStartTime } = req.body;

    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.role !== 'candidate') {
      return res.status(404).json({ message: "Candidat introuvable." });
    }

    // 🎯 PREVENT double actions (only if trying to take a NEW action)
    if (['Confirmed', 'Declined', 'RescheduleRequested', 'RescheduledSameDay', 'Expired'].includes(candidate.convocationStatus)) {
      return res.status(400).json({ 
        message: "Vous avez déjà répondu à cette convocation. Actualisez la page pour voir votre statut actuel.",
        alreadyResponded: true
      });
    }

    const responseDate = new Date();

    switch (action) {
      case 'confirm':
        // console.log(`✅ Candidate ${candidateId} confirming presence`);
        
        await User.findByIdAndUpdate(candidateId, {
          convocationStatus: 'Confirmed',
          convocationResponseDate: responseDate,
          memberstatus: 'TestScheduled',
          requestedNewTime: null
        });
        
        return res.status(200).json({
          message: "Votre présence a été confirmée avec succès!",
          status: 'confirmed'
        });

      case 'decline':
        // console.log(`❌ Candidate ${candidateId} declining convocation - Starting deletion process`);
        
        // Update status to declined first
        await User.findByIdAndUpdate(candidateId, {
          convocationStatus: 'Declined',
          convocationResponseDate: responseDate,
          memberstatus: 'Rejected',
          requestedNewTime: null
        });
        
        // Remove audition slot
        await AuditionSlot.deleteOne({ candidate: candidateId });
        
        // Complete deletion process
        await handleConvocationDecline(candidateId);
        
        return res.status(200).json({
          message: "Votre candidature a été déclinée et supprimée du système.",
          status: 'declined'
        });

      case 'reschedule':
        if (!rescheduleType) {
          return res.status(400).json({ message: "Type de reprogrammation requis." });
        }
        
        if (rescheduleType === 'different_day') {
          // console.log(`📅 Candidate ${candidateId} requesting different day reschedule`);
          
          await User.findByIdAndUpdate(candidateId, {
            memberstatus: 'Pending',
            convocationStatus: 'RescheduleRequested',
            convocationResponseDate: responseDate,
            requestedNewTime: null
          });

          // Remove current audition slot
          await AuditionSlot.deleteOne({ candidate: candidateId });
          
          return res.status(200).json({
            message: "Votre demande de changement de jour a été enregistrée. Vous serez contacté pour un nouveau créneau.",
            status: 'rescheduled_different_day'
          });
          
        } else if (rescheduleType === 'same_day') {
          if (!newStartTime) {
            return res.status(400).json({ message: "Heure de début requise pour le même jour." });
          }
          
          // Validate time format (HH:00 only)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):00$/;
          if (!timeRegex.test(newStartTime)) {
            return res.status(400).json({ message: "Format d'heure invalide. Utilisez le format HH:00." });
          }
          
          // console.log(`⏰ Candidate ${candidateId} requesting same day time change to ${newStartTime}`);
          
          await User.findByIdAndUpdate(candidateId, {
            convocationStatus: 'RescheduledSameDay',
            requestedNewTime: newStartTime,
            convocationResponseDate: responseDate
          });
          
          return res.status(200).json({
            message: "Votre demande de nouveau créneau a été envoyée à l'administration. Vous serez contacté bientôt.",
            status: 'rescheduled_same_day_pending',
            requestedTime: newStartTime
          });
          
        } else {
          return res.status(400).json({ message: "Type de reprogrammation invalide." });
        }

      default:
        return res.status(400).json({ message: "Action invalide." });
    }

  } catch (error) {
    console.error('Error handling convocation response:', error);
    return res.status(500).json({ 
      message: "Erreur serveur lors du traitement de votre réponse." 
    });
  }
};

// GET: Get available time slots for the same audition date
export const getAvailableTimes = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // console.log(`🕐 Fetching available times for candidate ${candidateId}`);
    
    // Get candidate's current audition slot
    const currentSlot = await AuditionSlot.findOne({ candidate: candidateId });
    if (!currentSlot) {
      return res.status(404).json({ 
        message: "Créneau d'audition introuvable.",
        error: "SLOT_NOT_FOUND"
      });
    }
    
    const auditionDate = currentSlot.date;
    // console.log(`📅 Audition date: ${auditionDate.toISOString().split('T')[0]}`);
    
    // 🎯 GET THE AUDITION PARAMETERS FOR THIS DATE
    const auditionParams = await AuditionParams.findOne({
      startDate: { $lte: auditionDate },
      endDate: { $gte: auditionDate }
    });
    
    if (!auditionParams) {
      // console.log(`❌ No audition parameters found for date ${auditionDate}`);
      return res.status(404).json({ 
        message: "Paramètres d'audition introuvables pour cette date.",
        error: "PARAMS_NOT_FOUND"
      });
    }
    
    // 🎯 GENERATE ALL TIME SLOTS WITHIN SESSION RANGE (EXCLUDING PAUSE)
    const availableSlots = generateTimeSlotsWithPause(
      auditionParams.sessionStartTime,  // e.g., "09:00"
      auditionParams.sessionEndTime,    // e.g., "17:30"
      auditionParams.debutPause,        // e.g., "12:00" or null
      auditionParams.finPause           // e.g., "13:00" or null
    );
    
    // console.log(`✅ Generated ${availableSlots.length} available slots:`, availableSlots);
    
    return res.status(200).json({
      availableSlots: availableSlots,
      sessionInfo: {
        sessionStartTime: auditionParams.sessionStartTime,
        sessionEndTime: auditionParams.sessionEndTime,
        debutPause: auditionParams.debutPause,
        finPause: auditionParams.finPause,
        date: auditionDate.toISOString().split('T')[0]
      },
      statistics: {
        totalAvailableSlots: availableSlots.length,
        currentSlot: currentSlot.startTime
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    return res.status(500).json({ 
      message: "Erreur serveur lors de la récupération des créneaux disponibles.",
      error: error.message
    });
  }
};

// 🎯 HELPER FUNCTION: Generate time slots excluding pause
const generateTimeSlotsWithPause = (sessionStart, sessionEnd, debutPause, finPause) => {
  const slots = [];
  
  try {
    // Parse session times
    const [startHour, startMinute] = sessionStart.split(':').map(Number);
    const [endHour, endMinute] = sessionEnd.split(':').map(Number);
    
    // Parse pause times (if they exist)
    let pauseStartMinutes = null;
    let pauseEndMinutes = null;
    
    if (debutPause && finPause) {
      const [pauseStartHour, pauseStartMin] = debutPause.split(':').map(Number);
      const [pauseEndHour, pauseEndMin] = finPause.split(':').map(Number);
      pauseStartMinutes = pauseStartHour * 60 + pauseStartMin;
      pauseEndMinutes = pauseEndHour * 60 + pauseEndMin;
    }
    
    // Convert to minutes for easier comparison
    const sessionStartMinutes = startHour * 60 + startMinute;
    const sessionEndMinutes = endHour * 60 + endMinute;
    
    // Generate hourly slots (60-minute intervals)
    for (let minutes = sessionStartMinutes; minutes < sessionEndMinutes; minutes += 60) {
      // 🎯 Skip if this time is during pause
      if (pauseStartMinutes !== null && pauseEndMinutes !== null) {
        if (minutes >= pauseStartMinutes && minutes < pauseEndMinutes) {
          continue; // Skip pause time
        }
      }
      
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      slots.push(timeString);
    }
    
    return slots;
  } catch (error) {
    console.error('❌ Error generating time slots:', error);
    return [];
  }
};

// 🎯 NEW: 24h Reminder System
export const processReminderSystem = async () => {
  try {
    // console.log('🔔 Processing 24h reminder system...');
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find candidates who received convocation more than 24h ago and haven't responded
    const candidatesForReminder = await User.find({
      convocationStatus: 'Sent',
      role: 'candidate',
      convocationResponseDate: { $exists: false },
      updatedAt: { $lt: yesterday } // Last updated more than 24h ago
    });

    // console.log(`📧 Found ${candidatesForReminder.length} candidates for reminder`);

    let remindersSent = 0;
    let movedToPending = 0;

    for (const candidate of candidatesForReminder) {
      try {
        // Get candidate's audition slot
        const auditionSlot = await AuditionSlot.findOne({ candidate: candidate._id });
        
        if (!auditionSlot) {
          // console.log(`⚠️ No audition slot found for candidate ${candidate._id}`);
          continue;
        }

        const auditionDate = new Date(auditionSlot.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        auditionDate.setHours(0, 0, 0, 0);

        // Check if audition is today
        if (auditionDate.getTime() === today.getTime()) {
          // console.log(`📅 Audition is TODAY for ${candidate.firstName} ${candidate.lastName} - Moving to Pending`);
          
          // Move to Pending and remove audition slot
          await User.findByIdAndUpdate(candidate._id, {
            memberstatus: 'Pending',
            convocationStatus: 'Expired',
            convocationResponseDate: new Date()
          });

          await AuditionSlot.deleteOne({ candidate: candidate._id });
          movedToPending++;
          
        } else {
          // Check if reminder already sent
          if (candidate.reminderSent) {
            // console.log(`📧 Reminder already sent to ${candidate.firstName} ${candidate.lastName}`);
            continue;
          }

          // console.log(`📧 Sending reminder to ${candidate.firstName} ${candidate.lastName}`);
          
          // Send reminder email
          const emailData = createReminderEmailTemplate({
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            candidateId: candidate._id,
            assignedDate: auditionSlot.date,
            assignedTime: auditionSlot.startTime,
            assignedEndTime: auditionSlot.endTime
          });

          await sendNotification({
            email: candidate.email,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            attachments: emailData.attachments
          });

          // Update reminder sent status
          await User.findByIdAndUpdate(candidate._id, {
            reminderSent: true,
            reminderSentDate: new Date()
          });

          remindersSent++;
        }

      } catch (error) {
        console.error(`❌ Error processing candidate ${candidate._id}:`, error.message);
      }
    }

    // console.log(`✅ Reminder system completed: ${remindersSent} reminders sent, ${movedToPending} moved to Pending`);
    return { remindersSent, movedToPending };

  } catch (error) {
    console.error('💥 Reminder system failed:', error);
    throw error;
  }
};

// 🎯 UTILITY: Calculate end time (helper for other functions)
export const calculateEndTime = (startTime) => {
  try {
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = hour + 1; // 1-hour slots
    return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('❌ Error calculating end time:', error);
    return startTime;
  }
};