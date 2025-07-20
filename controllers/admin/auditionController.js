import AuditionParams from "../../models/auditionParamsModel.js";
import AuditionSlot from "../../models/auditionSlotModel.js";
import User from "../../models/userModel.js";
import { createTestDateEmailTemplate } from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";

// Helper: minutes → "HH:MM"

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// export const generateAuditions = async (req, res) => {
//   try {
//     const { paramsId } = req.body;
//     if (!paramsId) {
//       return res.status(400).json({ message: "ID des paramètres manquant." });
//     }

//     // 1) Get audition parameters - USE EVERYTHING FROM THERE
//     const params = await AuditionParams.findById(paramsId);
//     if (!params) {
//       return res.status(404).json({ message: "Paramètres introuvables." });
//     }

//     // 2) Get all pending candidates
//     const candidates = await User.find({ role: "candidate", memberstatus: "Pending" });
//     if (candidates.length === 0) {
//       return res.status(400).json({ message: "Aucun candidat en attente." });
//     }

//     // 3) Use audition's time calculation directly
//     const [hS, mS] = params.sessionStartTime.split(":").map(Number);
//     const [hE, mE] = params.sessionEndTime.split(":").map(Number);
//     const sessionStartMin = hS * 60 + mS;
//     const sessionEndMin = hE * 60 + mE;
//     let availableTime = sessionEndMin - sessionStartMin;

//     // Subtract break
//     if (params.debutPause && params.finPause) {
//       const [hD, mD] = params.debutPause.split(":").map(Number);
//       const [hF, mF] = params.finPause.split(":").map(Number);
//       availableTime -= ((hF * 60 + mF) - (hD * 60 + mD));
//     }

//     // 4) Calculate slot duration from audition capacity
//     const slotDuration = Math.floor(availableTime / params.candidateCount);

//     // 5) Create slots for all candidates
//     const slotsToInsert = [];
//     let currentMin = sessionStartMin;
//     const auditionDate = new Date(params.startDate);

//     for (let i = 0; i < candidates.length; i++) {
//       // Skip break if needed
//       if (params.debutPause && params.finPause) {
//         const breakStart = (() => { const [h, m] = params.debutPause.split(":").map(Number); return h * 60 + m; })();
//         const breakEnd = (() => { const [h, m] = params.finPause.split(":").map(Number); return h * 60 + m; })();
        
//         if (currentMin >= breakStart && currentMin < breakEnd) {
//           currentMin = breakEnd;
//         }
//         if (currentMin < breakStart && currentMin + slotDuration > breakStart) {
//           currentMin = breakEnd;
//         }
//       }

//       slotsToInsert.push({
//         date: new Date(auditionDate),
//         startTime: minutesToTime(currentMin),
//         endTime: minutesToTime(currentMin + slotDuration),
//         candidate: candidates[i]._id,
//       });

//       currentMin += slotDuration;
//     }

//     // 6) Save everything
//     const createdSlots = await AuditionSlot.insertMany(slotsToInsert);
    
//     // Update all candidates
//     const candidateIds = candidates.map(c => c._id);
//     await User.updateMany(
//       { _id: { $in: candidateIds } },
//       { memberstatus: "TestScheduled" }
//     );

//     // 7) Send emails
//     for (const slot of createdSlots) {
//       const user = await User.findById(slot.candidate);
//       if (user) {
//         try {
//           const emailData = createTestDateEmailTemplate({
//             firstName: user.firstName,
//             lastName: user.lastName,
//             email: user.email,
//             assignedDate: slot.date,
//             assignedTime: slot.startTime,
//             debutPause: params.debutPause,
//             finPause: params.finPause,
//           });
//           await sendNotification({
//             email: user.email,
//             subject: emailData.subject,
//             htmlContent: emailData.htmlContent,
//             attachments: emailData.attachments,
//           });
//         } catch (emailError) {
//           // Continue if email fails
//         }
//       }
//     }

//     return res.status(201).json({
//       message: `${candidates.length} candidats programmés.`,
//       slots: createdSlots
//     });

//   } catch (err) {
//     console.error("Error:", err);
//     return res.status(500).json({ message: "Erreur serveur." });
//   }
// };



export const generateAuditions = async (req, res) => {
  try {
    const { paramsId } = req.body;
    if (!paramsId) {
      return res.status(400).json({ message: "ID des paramètres manquant." });
    }

    // 1) Get audition parameters
    const params = await AuditionParams.findById(paramsId);
    if (!params) {
      return res.status(404).json({ message: "Paramètres introuvables." });
    }

    // 2) Get LIMITED pending candidates based on audition capacity
    const candidates = await User.find({ role: "candidate", memberstatus: "Pending" })
      .limit(params.candidateCount)
      .sort({ createdAt: 1 }); // First come, first served
    
    if (candidates.length === 0) {
      return res.status(400).json({ message: "Aucun candidat en attente." });
    }

    // 3) Calculate available time
    const [hS, mS] = params.sessionStartTime.split(":").map(Number);
    const [hE, mE] = params.sessionEndTime.split(":").map(Number);
    const sessionStartMin = hS * 60 + mS;
    const sessionEndMin = hE * 60 + mE;
    let availableTime = sessionEndMin - sessionStartMin;

    // Subtract break time
    if (params.debutPause && params.finPause) {
      const [hD, mD] = params.debutPause.split(":").map(Number);
      const [hF, mF] = params.finPause.split(":").map(Number);
      availableTime -= ((hF * 60 + mF) - (hD * 60 + mD));
    }

    // 4) Calculate slot duration from actual candidates
    const slotDuration = Math.floor(availableTime / candidates.length);

    // 5) Create slots for selected candidates only
    const slotsToInsert = [];
    let currentMin = sessionStartMin;
    const auditionDate = new Date(params.startDate);

    for (let i = 0; i < candidates.length; i++) {
      // 🎯 IMPROVED Break handling - Allows slots that end exactly at break start
      if (params.debutPause && params.finPause) {
        const breakStart = (() => { 
          const [h, m] = params.debutPause.split(":").map(Number); 
          return h * 60 + m; 
        })();
        const breakEnd = (() => { 
          const [h, m] = params.finPause.split(":").map(Number); 
          return h * 60 + m; 
        })();
        
        // Case 1: Current slot starts during break
        if (currentMin >= breakStart && currentMin < breakEnd) {
          currentMin = breakEnd;
        }
        // Case 2: Slot would OVERLAP INTO break (not just touch at boundary)
        else if (currentMin < breakStart && (currentMin + slotDuration) > breakStart) {
          // 🎯 KEY FIX: Check if we can fit slot before break
          const timeBeforeBreak = breakStart - currentMin;
          if (timeBeforeBreak >= 15) { // Minimum 15 minutes for meaningful slot
            // Create shorter slot before break
            slotsToInsert.push({
              date: new Date(auditionDate),
              startTime: minutesToTime(currentMin),
              endTime: minutesToTime(breakStart),
              candidate: candidates[i]._id,
            });
            currentMin = breakEnd; // Next slot starts after break
            continue;
          } else {
            // Not enough time before break, jump to after break
            currentMin = breakEnd;
          }
        }
        // Case 3: Slot would span entire break
        else if (currentMin < breakStart && (currentMin + slotDuration) >= breakEnd) {
          currentMin = breakEnd;
        }
      }

      // Create regular slot
      const slotEnd = Math.min(currentMin + slotDuration, sessionEndMin);
      
      // Safety check: Don't create slots that exceed session time
      if (currentMin >= sessionEndMin) {
        console.warn(`Cannot schedule candidate ${i + 1} - session time exceeded`);
        break;
      }

      slotsToInsert.push({
        date: new Date(auditionDate),
        startTime: minutesToTime(currentMin),
        endTime: minutesToTime(slotEnd),
        candidate: candidates[i]._id,
      });

      currentMin = slotEnd;
    }

    // 6) Save slots and update ONLY selected candidates
    if (slotsToInsert.length === 0) {
      return res.status(400).json({ message: "Impossible de créer des créneaux avec ces paramètres." });
    }

    const createdSlots = await AuditionSlot.insertMany(slotsToInsert);
    
    const candidateIds = slotsToInsert.map(slot => slot.candidate);
    await User.updateMany(
      { _id: { $in: candidateIds } },
      { memberstatus: "TestScheduled" }
    );

    // 7) Send email notifications
    for (const slot of createdSlots) {
      const user = await User.findById(slot.candidate);
      if (user) {
        try {
          const emailData = createTestDateEmailTemplate({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            assignedDate: slot.date,
            assignedTime: slot.startTime,
            debutPause: params.debutPause,
            finPause: params.finPause,
          });
          await sendNotification({
            email: user.email,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            attachments: emailData.attachments,
          });
        } catch (emailError) {
          console.error("Email notification failed:", emailError);
          // Continue if email fails
        }
      }
    }

    return res.status(201).json({
      message: `${createdSlots.length} candidats programmés sur ${params.candidateCount} places disponibles.`,
      slots: createdSlots,
      actualScheduled: createdSlots.length,
      requestedCapacity: params.candidateCount
    });

  } catch (err) {
    console.error("Generate auditions error:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

