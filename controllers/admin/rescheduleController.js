// controllers/adminRescheduleController.js
import User from '../../models/userModel.js';
import AuditionSlot from '../../models/auditionSlotModel.js';
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { createTimeUpdateEmailTemplate, createRescheduleRejectionEmailTemplate } from '../../tools/mail/notifTemplate.js';



// 🎯 UTILITY: Calculate end time (helper for admin functions)
const calculateEndTime = (startTime) => {
  try {
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = hour + 1; // 1-hour slots
    return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('❌ Error calculating end time:', error);
    return startTime;
  }
};

// GET: Get all candidates with different types of reschedule statuses
export const getAllRescheduleRequests = async (req, res) => {
  try {
    // console.log('📋 Admin fetching all reschedule requests...');

    // Get different day reschedule requests
    const differentDayRequests = await User.find({
      convocationStatus: 'RescheduleRequested'
    }).select('firstName lastName email convocationResponseDate memberstatus');

    // Get same day reschedule requests with their slots
    const sameDayRequests = await User.find({
      convocationStatus: 'RescheduledSameDay'
    }).select('firstName lastName email requestedNewTime convocationResponseDate');

    // Get current slots for same day requests
    const sameDayWithSlots = [];
    for (const candidate of sameDayRequests) {
      const currentSlot = await AuditionSlot.findOne({ candidate: candidate._id });
      sameDayWithSlots.push({
        candidateId: candidate._id,
        candidate: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email
        },
        currentSlot: currentSlot ? {
          date: currentSlot.date,
          startTime: currentSlot.startTime,
          endTime: currentSlot.endTime
        } : null,
        requestedTime: candidate.requestedNewTime,
        requestDate: candidate.convocationResponseDate
      });
    }

    // console.log(`✅ Found ${differentDayRequests.length} different-day + ${sameDayWithSlots.length} same-day requests`);

    return res.status(200).json({
      differentDayRequests: differentDayRequests.map(req => ({
        candidateId: req._id,
        candidate: {
          firstName: req.firstName,
          lastName: req.lastName,
          email: req.email
        },
        requestDate: req.convocationResponseDate,
        currentStatus: req.memberstatus
      })),
      sameDayRequests: sameDayWithSlots,
      totalCount: differentDayRequests.length + sameDayWithSlots.length,
      message: `${differentDayRequests.length + sameDayWithSlots.length} demandes de reprogrammation trouvées.`
    });

  } catch (error) {
    console.error('❌ Error fetching all reschedule requests:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET: Get reschedule statistics for admin dashboard
export const getRescheduleStatistics = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ convocationStatus: 'Sent' }),
      User.countDocuments({ convocationStatus: 'Confirmed' }),
      User.countDocuments({ convocationStatus: 'RescheduleRequested' }),
      User.countDocuments({ convocationStatus: 'RescheduledSameDay' }),
      User.countDocuments({ convocationStatus: 'Declined' })
    ]);

    return res.status(200).json({
      pending: stats[0],
      confirmed: stats[1],
      differentDayReschedule: stats[2],
      sameDayReschedule: stats[3],
      declined: stats[4],
      total: stats.reduce((a, b) => a + b, 0)
    });

  } catch (error) {
    console.error('❌ Error fetching reschedule statistics:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// 🎯 MOVED FROM CONVOCATION CONTROLLER: GET all same-day reschedule requests for admin
export const getSameDayRescheduleRequests = async (req, res) => {
  try {
    // console.log('📋 Admin fetching same-day reschedule requests...');

    const candidates = await User.find({
      convocationStatus: 'RescheduledSameDay'
    }).select('firstName lastName email requestedNewTime convocationResponseDate');

    // Get their current audition slots
    const requestsWithSlots = [];
    for (const candidate of candidates) {
      const currentSlot = await AuditionSlot.findOne({ candidate: candidate._id });
      requestsWithSlots.push({
        candidateId: candidate._id,
        candidate: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email
        },
        currentSlot: currentSlot ? {
          date: currentSlot.date,
          startTime: currentSlot.startTime,
          endTime: currentSlot.endTime
        } : null,
        requestedTime: candidate.requestedNewTime,
        requestDate: candidate.convocationResponseDate
      });
    }

    // console.log(`✅ Found ${requestsWithSlots.length} same-day reschedule requests`);

    return res.status(200).json({
      requests: requestsWithSlots,
      count: requestsWithSlots.length,
      message: `${requestsWithSlots.length} demandes de reprogrammation trouvées.`
    });

  } catch (error) {
    console.error('❌ Error fetching same-day reschedule requests:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Updated approveSameDayReschedule function
export const approveSameDayReschedule = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // console.log(`✅ Admin approving same-day reschedule for candidate ${candidateId}`);
    
    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.convocationStatus !== 'RescheduledSameDay') {
      return res.status(404).json({ message: "Demande introuvable ou déjà traitée." });
    }

    const currentSlot = await AuditionSlot.findOne({ candidate: candidateId });
    if (!currentSlot) {
      return res.status(404).json({ message: "Créneau d'audition introuvable." });
    }

    const newStartTime = candidate.requestedNewTime;
    
    // Check if requested time is still available
    const conflictingSlot = await AuditionSlot.findOne({
      date: currentSlot.date,
      startTime: newStartTime,
      candidate: { $ne: candidateId }
    });
    
    if (conflictingSlot) {
      // console.log(`❌ Conflict detected for time ${newStartTime}`);
      return res.status(409).json({ 
        message: `Le créneau ${newStartTime} n'est plus disponible.`,
        conflict: true
      });
    }

    // Calculate new end time
    const newEndTime = calculateEndTime(newStartTime);
    
    // Update the slot
    await AuditionSlot.findByIdAndUpdate(currentSlot._id, {
      startTime: newStartTime,
      endTime: newEndTime,
      updatedAt: new Date()
    });
    
    // Update candidate status to confirmed
    await User.findByIdAndUpdate(candidateId, {
      convocationStatus: 'Confirmed',
      requestedNewTime: null,
      memberstatus: 'TestScheduled'
    });

    // Get updated slot for response
    const updatedSlot = await AuditionSlot.findById(currentSlot._id);

    // console.log(`✅ Approved reschedule: ${candidate.firstName} ${candidate.lastName} -> ${newStartTime}-${newEndTime}`);
    
    // 🎯 SEND TIME UPDATE EMAIL - FIXED PARAMETERS
    try {
      const emailTemplate = createTimeUpdateEmailTemplate({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        candidateId: candidate._id,
        newDate: updatedSlot.date,
        newStartTime: updatedSlot.startTime,
        newEndTime: updatedSlot.endTime,
        debutPause: null,
        finPause: null
      });

      // 🎯 FIXED: Match your sendNotification parameters exactly
      await sendNotification({
        email: candidate.email,        // 🎯 Use 'email' not 'to'
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.htmlContent,  // 🎯 Use 'htmlContent' not 'html'
        attachments: emailTemplate.attachments
      });

      // console.log(`📧 Time update email sent to ${candidate.email}`);
    } catch (emailError) {
      console.error('❌ Error sending time update email:', emailError);
      // Don't fail the whole operation if email fails
    }

    return res.status(200).json({
      message: `Demande approuvée pour ${candidate.firstName} ${candidate.lastName}. Nouveau créneau: ${newStartTime} - ${newEndTime}`,
      approved: true,
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      },
      updatedSlot: {
        date: updatedSlot.date,
        startTime: updatedSlot.startTime,
        endTime: updatedSlot.endTime
      }
    });

  } catch (error) {
    console.error('❌ Error approving same-day reschedule:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Updated rejectSameDayReschedule function
export const rejectSameDayReschedule = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { reason } = req.body;
    
    // console.log(`❌ Admin rejecting same-day reschedule for candidate ${candidateId}`);
    
    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.convocationStatus !== 'RescheduledSameDay') {
      return res.status(404).json({ message: "Demande introuvable ou déjà traitée." });
    }

    // 🎯 RESET TO PENDING STATUS (back to waiting list)
    await User.findByIdAndUpdate(candidateId, {
      convocationStatus: 'RescheduleRequested',
      requestedNewTime: null,
      memberstatus: 'Pending',
      convocationDeadline: null
    });

    // 🎯 REMOVE CURRENT AUDITION SLOT (back to waiting list)
    await AuditionSlot.deleteOne({ candidate: candidateId });

    // console.log(`❌ Rejected reschedule: ${candidate.firstName} ${candidate.lastName}. Reason: ${reason || 'Non spécifiée'}`);

    // 🎯 SEND REJECTION EMAIL - FIXED PARAMETERS
    try {
      const emailTemplate = createRescheduleRejectionEmailTemplate({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        reason: reason || 'Créneau non disponible'
      });

      // 🎯 FIXED: Match your sendNotification parameters exactly
      await sendNotification({
        email: candidate.email,        // 🎯 Use 'email' not 'to'
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.htmlContent,  // 🎯 Use 'htmlContent' not 'html'
        attachments: emailTemplate.attachments
      });

      // console.log(`📧 Rejection email sent to ${candidate.email}`);
    } catch (emailError) {
      console.error('❌ Error sending rejection email:', emailError);
      // Don't fail the whole operation if email fails
    }

    return res.status(200).json({
      message: `Demande rejetée pour ${candidate.firstName} ${candidate.lastName}. Le candidat est maintenant en liste d'attente pour un nouveau jour.`,
      rejected: true,
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      },
      reason: reason || 'Créneau non disponible'
    });

  } catch (error) {
    console.error('❌ Error rejecting same-day reschedule:', error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};