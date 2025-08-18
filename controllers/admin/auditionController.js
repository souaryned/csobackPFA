import mongoose from "mongoose"; // 🎯 ADD THIS LINE
import AuditionParams from "../../models/auditionParamsModel.js";
import AuditionSlot from "../../models/auditionSlotModel.js";
import User from "../../models/userModel.js";
import { createTestDateEmailTemplate } from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";

// // Helper: minutes → "HH:MM"

// function minutesToTime(minutes) {
//   const hours = Math.floor(minutes / 60);
//   const mins = minutes % 60;
//   return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
// }

// // export const generateAuditions = async (req, res) => {
// //   try {
// //     const { paramsId } = req.body;
// //     if (!paramsId) {
// //       return res.status(400).json({ message: "ID des paramètres manquant." });
// //     }

// //     // 1) Get audition parameters - USE EVERYTHING FROM THERE
// //     const params = await AuditionParams.findById(paramsId);
// //     if (!params) {
// //       return res.status(404).json({ message: "Paramètres introuvables." });
// //     }

// //     // 2) Get all pending candidates
// //     const candidates = await User.find({ role: "candidate", memberstatus: "Pending" });
// //     if (candidates.length === 0) {
// //       return res.status(400).json({ message: "Aucun candidat en attente." });
// //     }

// //     // 3) Use audition's time calculation directly
// //     const [hS, mS] = params.sessionStartTime.split(":").map(Number);
// //     const [hE, mE] = params.sessionEndTime.split(":").map(Number);
// //     const sessionStartMin = hS * 60 + mS;
// //     const sessionEndMin = hE * 60 + mE;
// //     let availableTime = sessionEndMin - sessionStartMin;

// //     // Subtract break
// //     if (params.debutPause && params.finPause) {
// //       const [hD, mD] = params.debutPause.split(":").map(Number);
// //       const [hF, mF] = params.finPause.split(":").map(Number);
// //       availableTime -= ((hF * 60 + mF) - (hD * 60 + mD));
// //     }

// //     // 4) Calculate slot duration from audition capacity
// //     const slotDuration = Math.floor(availableTime / params.candidateCount);

// //     // 5) Create slots for all candidates
// //     const slotsToInsert = [];
// //     let currentMin = sessionStartMin;
// //     const auditionDate = new Date(params.startDate);

// //     for (let i = 0; i < candidates.length; i++) {
// //       // Skip break if needed
// //       if (params.debutPause && params.finPause) {
// //         const breakStart = (() => { const [h, m] = params.debutPause.split(":").map(Number); return h * 60 + m; })();
// //         const breakEnd = (() => { const [h, m] = params.finPause.split(":").map(Number); return h * 60 + m; })();
        
// //         if (currentMin >= breakStart && currentMin < breakEnd) {
// //           currentMin = breakEnd;
// //         }
// //         if (currentMin < breakStart && currentMin + slotDuration > breakStart) {
// //           currentMin = breakEnd;
// //         }
// //       }

// //       slotsToInsert.push({
// //         date: new Date(auditionDate),
// //         startTime: minutesToTime(currentMin),
// //         endTime: minutesToTime(currentMin + slotDuration),
// //         candidate: candidates[i]._id,
// //       });

// //       currentMin += slotDuration;
// //     }

// //     // 6) Save everything
// //     const createdSlots = await AuditionSlot.insertMany(slotsToInsert);
    
// //     // Update all candidates
// //     const candidateIds = candidates.map(c => c._id);
// //     await User.updateMany(
// //       { _id: { $in: candidateIds } },
// //       { memberstatus: "TestScheduled" }
// //     );

// //     // 7) Send emails
// //     for (const slot of createdSlots) {
// //       const user = await User.findById(slot.candidate);
// //       if (user) {
// //         try {
// //           const emailData = createTestDateEmailTemplate({
// //             firstName: user.firstName,
// //             lastName: user.lastName,
// //             email: user.email,
// //             assignedDate: slot.date,
// //             assignedTime: slot.startTime,
// //             debutPause: params.debutPause,
// //             finPause: params.finPause,
// //           });
// //           await sendNotification({
// //             email: user.email,
// //             subject: emailData.subject,
// //             htmlContent: emailData.htmlContent,
// //             attachments: emailData.attachments,
// //           });
// //         } catch (emailError) {
// //           // Continue if email fails
// //         }
// //       }
// //     }

// //     return res.status(201).json({
// //       message: `${candidates.length} candidats programmés.`,
// //       slots: createdSlots
// //     });

// //   } catch (err) {
// //     console.error("Error:", err);
// //     return res.status(500).json({ message: "Erreur serveur." });
// //   }
// // };



// export const generateAuditions = async (req, res) => {
//   try {
//     const { paramsId } = req.body;
//     if (!paramsId) {
//       return res.status(400).json({ message: "ID des paramètres manquant." });
//     }

//     // 1) Get audition parameters
//     const params = await AuditionParams.findById(paramsId);
//     if (!params) {
//       return res.status(404).json({ message: "Paramètres introuvables." });
//     }

//     // 2) Get LIMITED pending candidates based on audition capacity
//     const candidates = await User.find({ role: "candidate", memberstatus: "Pending" })
//       .limit(params.candidateCount)
//       .sort({ createdAt: 1 }); // First come, first served
    
//     if (candidates.length === 0) {
//       return res.status(400).json({ message: "Aucun candidat en attente." });
//     }

//     // 3) Calculate available time
//     const [hS, mS] = params.sessionStartTime.split(":").map(Number);
//     const [hE, mE] = params.sessionEndTime.split(":").map(Number);
//     const sessionStartMin = hS * 60 + mS;
//     const sessionEndMin = hE * 60 + mE;
//     let availableTime = sessionEndMin - sessionStartMin;

//     // Subtract break time
//     if (params.debutPause && params.finPause) {
//       const [hD, mD] = params.debutPause.split(":").map(Number);
//       const [hF, mF] = params.finPause.split(":").map(Number);
//       availableTime -= ((hF * 60 + mF) - (hD * 60 + mD));
//     }

//     // 4) Calculate slot duration from actual candidates
//     const slotDuration = Math.floor(availableTime / candidates.length);

//     // 5) Create slots for selected candidates only
//     const slotsToInsert = [];
//     let currentMin = sessionStartMin;
//     const auditionDate = new Date(params.startDate);

//     for (let i = 0; i < candidates.length; i++) {
//       // 🎯 IMPROVED Break handling - Allows slots that end exactly at break start
//       if (params.debutPause && params.finPause) {
//         const breakStart = (() => { 
//           const [h, m] = params.debutPause.split(":").map(Number); 
//           return h * 60 + m; 
//         })();
//         const breakEnd = (() => { 
//           const [h, m] = params.finPause.split(":").map(Number); 
//           return h * 60 + m; 
//         })();
        
//         // Case 1: Current slot starts during break
//         if (currentMin >= breakStart && currentMin < breakEnd) {
//           currentMin = breakEnd;
//         }
//         // Case 2: Slot would OVERLAP INTO break (not just touch at boundary)
//         else if (currentMin < breakStart && (currentMin + slotDuration) > breakStart) {
//           // 🎯 KEY FIX: Check if we can fit slot before break
//           const timeBeforeBreak = breakStart - currentMin;
//           if (timeBeforeBreak >= 15) { // Minimum 15 minutes for meaningful slot
//             // Create shorter slot before break
//             slotsToInsert.push({
//               date: new Date(auditionDate),
//               startTime: minutesToTime(currentMin),
//               endTime: minutesToTime(breakStart),
//               candidate: candidates[i]._id,
//             });
//             currentMin = breakEnd; // Next slot starts after break
//             continue;
//           } else {
//             // Not enough time before break, jump to after break
//             currentMin = breakEnd;
//           }
//         }
//         // Case 3: Slot would span entire break
//         else if (currentMin < breakStart && (currentMin + slotDuration) >= breakEnd) {
//           currentMin = breakEnd;
//         }
//       }

//       // Create regular slot
//       const slotEnd = Math.min(currentMin + slotDuration, sessionEndMin);
      
//       // Safety check: Don't create slots that exceed session time
//       if (currentMin >= sessionEndMin) {
//         console.warn(`Cannot schedule candidate ${i + 1} - session time exceeded`);
//         break;
//       }

//       slotsToInsert.push({
//         date: new Date(auditionDate),
//         startTime: minutesToTime(currentMin),
//         endTime: minutesToTime(slotEnd),
//         candidate: candidates[i]._id,
//       });

//       currentMin = slotEnd;
//     }

//     // 6) Save slots and update candidates with convocation data
//     if (slotsToInsert.length === 0) {
//       return res.status(400).json({ message: "Impossible de créer des créneaux avec ces paramètres." });
//     }

//     const createdSlots = await AuditionSlot.insertMany(slotsToInsert);
    
//     // 🎯 UPDATE: Include convocation fields
//     const candidateIds = slotsToInsert.map(slot => slot.candidate);
//     const convocationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    
//     await User.updateMany(
//       { _id: { $in: candidateIds } },
//       { 
//         memberstatus: "TestScheduled",
//         convocationStatus: "Sent",                // 🎯 NEW
//         convocationDeadline: convocationDeadline  // 🎯 NEW
//       }
//     );

//     // 7) Send email notifications with response links
//     for (const slot of createdSlots) {
//       const user = await User.findById(slot.candidate);
//       if (user) {
//         try {
//           const emailData = createTestDateEmailTemplate({
//             firstName: user.firstName,
//             lastName: user.lastName,
//             candidateId: user._id,        // 🎯 ADD THIS
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
          
//           // console.log(`✅ Convocation sent to: ${user.firstName} ${user.lastName} (${user.email})`);
//         } catch (emailError) {
//           console.error("Email notification failed:", emailError);
//           // Continue if email fails
//         }
//       }
//     }

//     return res.status(201).json({
//       message: `${createdSlots.length} candidats programmés avec convocations envoyées.`,
//       slots: createdSlots,
//       actualScheduled: createdSlots.length,
//       requestedCapacity: params.candidateCount,
//       convocationDeadline: convocationDeadline.toISOString()
//     });

//   } catch (err) {
//     console.error("Generate auditions error:", err);
//     return res.status(500).json({ message: "Erreur serveur." });
//   }
// };



const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (min) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const generateAuditions = async (req, res) => {
  try {
    const { paramsId } = req.body;
    if (!paramsId) return res.status(400).json({ message: "ID des paramètres manquant." });

    const params = await AuditionParams.findById(paramsId);
    if (!params) return res.status(404).json({ message: "Paramètres introuvables." });

    const allCandidates = await User.find({
      role: "candidate",
      memberstatus: "Pending"
    }).sort({ createdAt: 1 });

    if (!allCandidates.length) {
      return res.status(400).json({ message: "Aucun candidat en attente." });
    }

    // console.log(`🚀 Processing ${allCandidates.length} audition slots - Started by: AzizHasnaoui at ${new Date().toISOString()}`);

    const candidatesPerHour = params.candidateCount;
    const slotsToInsert = [];
    const pauseStart = params.debutPause ? timeToMinutes(params.debutPause) : null;
    const pauseEnd = params.finPause ? timeToMinutes(params.finPause) : null;
    const sessionStart = timeToMinutes(params.sessionStartTime);
    const sessionEnd = timeToMinutes(params.sessionEndTime);

    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    let candidateIndex = 0;

    // Generate slots for each day in the range
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      if (candidateIndex >= allCandidates.length) break;

      // Generate hour blocks for this day (8-9, 9-10, 10-11, etc.)
      for (let hourStart = sessionStart; hourStart < sessionEnd; hourStart += 60) {
        if (candidateIndex >= allCandidates.length) break;

        // Skip pause hours
        if (pauseStart !== null && pauseEnd !== null) {
          if (hourStart >= pauseStart && hourStart < pauseEnd) {
            continue;
          }
        }

        const blockStartTime = minutesToTime(hourStart);
        const blockEndTime = minutesToTime(hourStart + 60);

        // Assign ALL candidates for this hour block
        for (let i = 0; i < candidatesPerHour && candidateIndex < allCandidates.length; i++) {
          const user = allCandidates[candidateIndex];
          
          slotsToInsert.push({
            date: new Date(currentDate),
            startTime: blockStartTime,
            endTime: blockEndTime,
            candidate: user._id,
            paramId: paramsId,
            status: 'Scheduled'
          });

          candidateIndex++;
        }
      }
    }

    if (!slotsToInsert.length) {
      return res.status(400).json({ message: "Impossible de générer les créneaux." });
    }

    // 🚀 PHASE 1: Create slots and update candidates (FAST)
    const createdSlots = await AuditionSlot.insertMany(slotsToInsert);
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const candidateIds = createdSlots.map(s => s.candidate);

    // Quick bulk update of candidate statuses
    await User.updateMany(
      { _id: { $in: candidateIds } },
      {
        memberstatus: "TestScheduled",
        convocationStatus: "Sent",
        convocationDeadline: deadline,
        notificationPending: true // Flag for background email processing
      }
    );

    // 🎯 IMMEDIATE RESPONSE (1-2 seconds total)
    res.status(201).json({
      success: true,
      message: `${createdSlots.length} convocations générées avec succès`,
      totalScheduled: createdSlots.length,
      candidatesPerHour: candidatesPerHour,
      deadline: deadline.toISOString(),
      emailStatus: 'processing_background',
      estimatedEmailTime: `${Math.ceil(createdSlots.length / 15)} minutes`,
      timestamp: new Date().toISOString()
    });

    // 🔥 PHASE 2: Background email sending
    setImmediate(async () => {
      // console.log(`📧 Starting background email processing for ${createdSlots.length} audition slots...`);
      
      const BATCH_SIZE = 15; // Process 15 candidates at a time for auditions
      let successful = 0;
      let failed = 0;
      const startTime = new Date();

      try {
        for (let i = 0; i < createdSlots.length; i += BATCH_SIZE) {
          const batch = createdSlots.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(createdSlots.length / BATCH_SIZE);
          
          // console.log(`⚡ Processing email batch ${batchNumber}/${totalBatches} (${batch.length} candidates)`);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (slot) => {
            try {
              // Get user details
              const user = await User.findById(slot.candidate);
              if (!user) {
                throw new Error('Candidate not found');
              }

              // Create email template
              const emailData = createTestDateEmailTemplate({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                candidateId: user._id,
                assignedDate: slot.date,
                assignedTime: slot.startTime,
                assignedEndTime: slot.endTime,
                debutPause: params.debutPause,
                finPause: params.finPause
              });

              // Send email
              await sendNotification({
                email: user.email,
                subject: emailData.subject,
                htmlContent: emailData.htmlContent,
                attachments: emailData.attachments
              });

              // Remove notification flag
              await User.findByIdAndUpdate(user._id, {
                $unset: { notificationPending: 1 }
              });

              // console.log(`✅ Email sent: ${user.firstName} ${user.lastName} (${slot.startTime}-${slot.endTime})`);
              return { success: true, candidate: user._id };

            } catch (error) {
              console.error(`❌ Email failed for slot ${slot._id}:`, error.message);
              
              // Remove notification flag even on failure
              try {
                await User.findByIdAndUpdate(slot.candidate, {
                  $unset: { notificationPending: 1 }
                });
              } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError.message);
              }
              
              return { success: false, error: error.message, candidate: slot.candidate };
            }
          });

          // Wait for batch completion
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Count results
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
              successful++;
            } else {
              failed++;
            }
          });

          // Progress logging
          const progress = Math.round(((i + batch.length) / createdSlots.length) * 100);
          // console.log(`📊 Email progress: ${progress}% (${successful} successful, ${failed} failed)`);
          
          // Delay between batches to avoid overwhelming email service
          if (i + BATCH_SIZE < createdSlots.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // console.log(`🎯 Audition email processing completed in ${duration}s`);
        // console.log(`📈 Final email results: ${successful} successful, ${failed} failed`);
        // console.log(`✨ Audition processing done! Completed by: AzizHasnaoui at ${endTime.toISOString()}`);

      } catch (backgroundError) {
        console.error('💥 Background audition email processing failed:', backgroundError);
      }
    });

  } catch (err) {
    console.error("Erreur serveur:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur.",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};


// In your user controller (or audition controller)
export const getConfirmedCandidatesForAudition = async (req, res) => {
  try {
    const { planningId } = req.params;
    
    if (!planningId) {
      return res.status(400).json({ message: "Planning ID manquant." });
    }

    // Find all slots for this specific planning
    const slots = await AuditionSlot.find({ paramId: planningId })
      .populate({
        path: 'candidate',
        match: { convocationStatus: 'Confirmed' },
        select: 'firstName lastName email gender convocationStatus'
      })
      .sort({ date: 1, startTime: 1 });

    // Filter out slots where candidate didn't match the confirmation criteria
    const confirmedSlots = slots.filter(slot => slot.candidate !== null);

    // Calculate statistics
    const totalCandidates = confirmedSlots.length;
    const dates = [...new Set(confirmedSlots.map(slot => slot.date.toDateString()))];
    const totalDays = dates.length;
    const averagePerDay = totalDays > 0 ? Math.round(totalCandidates / totalDays) : 0;

    // Calculate unique time blocks (THIS IS THE FIX)
    const uniqueTimeBlocks = [...new Set(confirmedSlots.map(slot => 
      `${slot.date.toDateString()}-${slot.startTime}-${slot.endTime}`
    ))];
    const totalTimeBlocks = uniqueTimeBlocks.length;

    // Group slots by date for better organization
    const slotsByDate = confirmedSlots.reduce((acc, slot) => {
      const dateKey = slot.date.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {});

    // Optional: Group slots by time blocks for better visualization
    const slotsByTimeBlock = confirmedSlots.reduce((acc, slot) => {
      const timeBlockKey = `${slot.date.toDateString()}-${slot.startTime}-${slot.endTime}`;
      if (!acc[timeBlockKey]) {
        acc[timeBlockKey] = {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          candidates: []
        };
      }
      acc[timeBlockKey].candidates.push(slot.candidate);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      planningId,
      totalCandidates,
      totalSlots: totalTimeBlocks, // ← FIXED: Now shows unique time blocks instead of individual slots
      totalDays,
      averagePerDay,
      slots: confirmedSlots,
      slotsByDate,
      slotsByTimeBlock, // ← NEW: Additional grouping for better visualization
      uniqueTimeBlocks, // ← NEW: List of unique time block identifiers
      message: `${totalCandidates} candidats confirmés dans ${totalTimeBlocks} blocs horaires.`
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des candidats confirmés',
      error: error.message 
    });
  }
};

