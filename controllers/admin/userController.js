

import User from "../../models/userModel.js";
import AuditionEvaluation from "../../models/auditionEvaluation.js"; // Add this import
import AuditionSlot from "../../models/auditionSlotModel.js";

import bcrypt from "bcrypt";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import {
  createAccountEmailTemplate,
  createPupitreUpdatedEmailTemplate,
  createRejectionEmailTemplate,
} from "../../tools/mail/notifTemplate.js";

// Utility: Generate a secure random password
const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};



export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      gender,
      birthDate,
      nationality,
      cin,
      height,
      hasMusicalKnowledge,
      hasInstrumentalKnowledge,
      phone,
      pupitre,
    } = req.body;

    // 1) Champs obligatoires
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    // 2) Vérifier l’email (toujours)
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      return res.status(409).json({ message: "Email existe deja." });
    }

    // 3) Si rôle = "choriste", vérifier aussi le CIN
    if (role === "choriste") {
      if (!cin) {
        return res
          .status(400)
          .json({ message: "CIN is required for choriste." });
      }
      const existingByCin = await User.findOne({ cin });
      if (existingByCin) {
        return res.status(409).json({ message: "Cin existe deja" });
      }
    }

    // 4) Générer et hasher le mot de passe
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 5) Construire l’objet userData de base
    const userData = {
      firstName,
      lastName,
      email,
      role,
      phone: phone || "",
      password: hashedPassword,
    };

    // 6) Si c’est un choriste, ajouter les champs spécifiques
    if (role === "choriste") {
      // vérifier que tous les champs choriste sont fournis
      if (!gender || !birthDate || !nationality || !height) {
        return res
          .status(400)
          .json({ message: "Missing fields for choriste." });
      }
      Object.assign(userData, {
        gender,
        birthDate,
        nationality,
        cin,
        height,
        hasMusicalKnowledge: !!hasMusicalKnowledge,
        hasInstrumentalKnowledge: !!hasInstrumentalKnowledge,
        pupitre: pupitre || "",
        status: "Junior",
      });
    }

    // 7) Sauvegarder en base
    const newUser = new User(userData);
    await newUser.save();

    // 8) Envoyer l’email de création de compte
    const emailData = createAccountEmailTemplate({
      firstName,
      lastName,
      email,
      password: plainPassword,
    });

    await sendNotification({
      email,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      attachments: emailData.attachments,
    });

    return res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      isLocked: { $ne: true },
      role: { $nin: ["admin", "candidate"] },
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

export const getLockedUsers = async (req, res) => {
  try {
    const users = await User.find({ isLocked: true });
    res.status(200).json({ lockedUsers: users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch locked users." });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      role,
      gender,
      birthDate,
      nationality,
      cin,
      hasMusicalKnowledge,
      hasInstrumentalKnowledge,
      height,
      phone,
      pupitre,
    } = req.body;

    // 1. Load existing user
    const oldUser = await User.findById(id);
    if (!oldUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Prevent duplicate emails
    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== id) {
      return res.status(409).json({ message: "User already exists." });
    }

    // 3. Build $set payload
    const setPayload = {
      firstName,
      lastName,
      email,
      role,
      phone,
    };

    if (role === "choriste") {
      Object.assign(setPayload, {
        gender,
        birthDate,
        nationality,
        cin,
        hasInstrumentalKnowledge,
        height,
        hasMusicalKnowledge,
        pupitre,
      });
    }

    // 4. Build $unset payload
    const unsetPayload = {};
    if (role !== "choriste") {
      unsetPayload.gender = "";
      unsetPayload.birthDate = "";
      unsetPayload.nationality = "";
      unsetPayload.cin = "";
      unsetPayload.height = "";
      unsetPayload.hasMusicalKnowledge = "";
      unsetPayload.hasInstrumentalKnowledge = "";
    }
    if (!["choriste"].includes(role)) {
      unsetPayload.pupitre = "";
    }

    // 5. Apply update with both $set and $unset
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: setPayload, $unset: unsetPayload },
      { new: true, runValidators: true }
    );

    // 6. If email changed, send notification
    if (email && email !== oldUser.email) {
      const emailData = createAccountEmailTemplate({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        password: "Votre mot de passe reste inchangé",
      });
      await sendNotification({
        email: updatedUser.email,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        attachments: emailData.attachments,
      });
    }

    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteUserPermanent = async (req, res) => {
  try {
    const { id } = req.params;
    // remove from DB entirely
    await User.findByIdAndDelete(id);
    return res.status(200).json({ message: "User permanently deleted." });
  } catch (error) {
    console.error("Error permanently deleting user:", error);
    return res
      .status(500)
      .json({ message: "Failed to permanently delete user." });
  }
};

export const lockUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(id, { isLocked: true });
    res.status(200).json({ message: "User locked successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to lock user." });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(id, { isLocked: false });
    res.status(200).json({ message: "User restored successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore user." });
  }
};

// // 📥 Eliminate Choriste (set status to éliminé + lock account)
// export const eliminateUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await User.findById(id);

//     if (!user) {
//       return res.status(404).json({ message: 'Utilisateur non trouvé.' });
//     }

//     if (user.role !== 'choriste') {
//       return res.status(400).json({ message: 'Seuls les choristes peuvent être éliminés.' });
//     }

//     user.isChoristeLocked = true; // ✅ your updated field
//     user.status = 'éliminé'; // ✅ update status

//     await user.save();

//     res.status(200).json({ message: 'Choriste éliminé avec succès.' });
//   } catch (error) {
//     console.error('Erreur lors de l’élimination:', error);
//     res.status(500).json({ message: 'Erreur serveur.' });
//   }
// };

// controllers/user.controller.js

export const getMembershipSubmissions = async (req, res) => {
  try {
    const status = req.query.status || "Pending";
    let query = { role: "candidate" };

    // Handle different status types
    if (status === "Auditioned") {
      query.memberstatus = "TestScheduled";
      query.isAuditioned = true;
    } else {
      query.memberstatus = status;
      if (status === "TestScheduled") {
        // Only non-auditioned scheduled candidates
        query.isAuditioned = { $ne: true };
      }
    }

    const submissions = await User.find(query, {
      firstName: 1,
      lastName: 1,
      email: 1,
      gender: 1,
      birthDate: 1,
      nationality: 1,
      cin: 1,
      height: 1,
      professionalSituation: 1,
      phone: 1,
      motivation: 1,
      isActiveInOtherChoir: 1,
      hasMusicalKnowledge: 1,
      musicalExperience: 1,
      otherChoir: 1,
      sponsorName: 1,
      isSponsored: 1,
      phoneCountryCode: 1,
      isAuditioned: 1,
      auditionnedAt: 1,
    });

    // If requesting auditioned candidates, populate evaluation data
    if (status === "Auditioned") {
      const candidatesWithEvaluations = [];
      for (const candidate of submissions) {
        const evaluation = await AuditionEvaluation.findOne({
          candidate: candidate._id,
        });
        candidatesWithEvaluations.push({
          ...candidate.toObject(),
          evaluationData: evaluation,
        });
      }
      return res.status(200).json(candidatesWithEvaluations);
    }

    return res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching membership submissions:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch membership submissions." });
  }
};

export const acceptMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    // ← allow candidates here, not just choristes
    if (!user || user.role !== "candidate") {
      return res.status(404).json({ message: "Candidate not found." });
    }

    // Generate password
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update user fields
    user.isLocked = false;
    user.memberstatus = "Accepted";
    user.password = hashedPassword;
    user.status = "Junior";
    user.role = "choriste"; // Ensure role is set to choriste

    await user.save();

    // Prepare & send email
    const emailData = createAccountEmailTemplate({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: plainPassword,
    });

    await sendNotification({
      email: user.email,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      attachments: emailData.attachments,
    });

    res
      .status(200)
      .json({ message: "Membership accepted and credentials sent." });
  } catch (error) {
    console.error("Error accepting membership:", error);
    res.status(500).json({ message: "Failed to accept membership." });
  }
};

export const refuseMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const user = await User.findById(id);

    if (!user || user.role !== "candidate") {
      return res.status(404).json({ message: "Candidate not found." });
    }

    // Send rejection email first
    const emailData = createRejectionEmailTemplate({
      firstName: user.firstName,
      lastName: user.lastName,
      reason,
    });

    await sendNotification({
      email: user.email,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      attachments: emailData.attachments,
    });

    // Then delete the user
    await user.deleteOne();

    res
      .status(200)
      .json({ message: "Membership refused, user notified and deleted." });
  } catch (error) {
    console.error("Error refusing membership:", error);
    res.status(500).json({ message: "Failed to refuse membership." });
  }
};

export const getAcceptedMemberships = async (req, res) => {
  try {
    const acceptedMembers = await User.find(
      { role: "choriste" },
      {
        firstName: 1,
        lastName: 1,
        email: 1,
        gender: 1,
        birthDate: 1,
        nationality: 1,
        cin: 1,
        height: 1,
        professionalSituation: 1,
        phone: 1,
        status: 1,
        memberstatus: 1,
        pupitre: 1,
      }
    );

    res.status(200).json(acceptedMembers);
  } catch (error) {
    console.error("Error fetching accepted memberships:", error);
    res.status(500).json({ message: "Failed to fetch accepted choristes." });
  }
};

// export const acceptRetenuCandidates = async (req, res) => {
//   try {
//     // Find all evaluations with "Retenu" decision and populate candidate info
//     const retenuEvaluations = await AuditionEvaluation.find({
//       decision: 'Retenu'
//     }).populate({
//       path: 'candidate',
//       match: { role: 'candidate' },
//       select: 'firstName lastName email role memberstatus isLocked status password'
//     });

//     // Filter out evaluations where candidate is null
//     const validRetenuEvaluations = retenuEvaluations.filter(evaluation =>
//       evaluation.candidate !== null
//     );

//     if (validRetenuEvaluations.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Aucun candidat retenu trouvé.'
//       });
//     }

//     const results = {
//       totalProcessed: validRetenuEvaluations.length,
//       successful: 0,
//       failed: 0,
//       details: []
//     };

//     // Process each candidate
//     for (const evaluation of validRetenuEvaluations) {
//       const candidate = evaluation.candidate;

//       try {
//         // Skip if already processed
//         if (candidate.memberstatus === 'Accepted') {
//           results.details.push({
//             candidateId: candidate._id,
//             name: `${candidate.firstName} ${candidate.lastName}`,
//             email: candidate.email,
//             status: 'skipped',
//             reason: 'Already accepted'
//           });
//           continue;
//         }

//         // Generate password and hash it
//         const plainPassword = generateRandomPassword();
//         const hashedPassword = await bcrypt.hash(plainPassword, 10);

//         // Update user fields
//         candidate.isLocked = false;
//         candidate.memberstatus = 'Accepted';
//         candidate.password = hashedPassword;
//         candidate.status = 'Junior';
//         candidate.role = 'choriste';

//         await candidate.save();

//         // Send email
//         const emailData = createAccountEmailTemplate({
//           firstName: candidate.firstName,
//           lastName: candidate.lastName,
//           email: candidate.email,
//           password: plainPassword,
//         });

//         await sendNotification({
//           email: candidate.email,
//           subject: emailData.subject,
//           htmlContent: emailData.htmlContent,
//           attachments: emailData.attachments,
//         });

//         results.successful++;
//         results.details.push({
//           candidateId: candidate._id,
//           name: `${candidate.firstName} ${candidate.lastName}`,
//           email: candidate.email,
//           status: 'success',
//           evaluationId: evaluation._id
//         });

//       } catch (error) {
//         results.failed++;
//         results.details.push({
//           candidateId: candidate._id,
//           name: `${candidate.firstName} ${candidate.lastName}`,
//           email: candidate.email,
//           status: 'failed',
//           error: error.message
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: `Traitement terminé: ${results.successful} acceptés, ${results.failed} échecs`,
//       results
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de l\'acceptation en masse.',
//       error: error.message
//     });
//   }
// };

export const acceptRetenuCandidates = async (req, res) => {
  try {
    // Find candidates to process
    const retenuEvaluations = await AuditionEvaluation.find({
      decision: 'Retenu'
    }).populate({
      path: 'candidate',
      match: { 
        role: 'candidate', 
        memberstatus: { $ne: 'Accepted' } 
      },
      select: 'firstName lastName email role memberstatus isLocked status'
    });

    const validEvaluations = retenuEvaluations.filter(evalu => evalu.candidate !== null);

    if (validEvaluations.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Aucun candidat retenu trouvé.'
      });
    }

    // console.log(`🚀 Processing ${validEvaluations.length} candidates - Started by: AzizHasnaoui at ${new Date().toISOString()}`);

    // 🚀 PHASE 1: Quick status updates without passwords (FAST)
    const quickUpdates = validEvaluations.map(evaluation => ({
      updateOne: {
        filter: { _id: evaluation.candidate._id },
        update: {
          isLocked: false,
          memberstatus: 'Accepted', 
          status: 'Junior',
          role: 'choriste',
          passwordPending: true, // Flag for background processing
          acceptedAt: new Date(),
          acceptedBy: req.user?._id
        }
      }
    }));

    // ⚡ INSTANT: Bulk update all candidates
    const bulkResult = await User.bulkWrite(quickUpdates);

    // 🎯 IMMEDIATE RESPONSE (1-2 seconds total)
    res.status(200).json({
      success: true,
      message: `${validEvaluations.length} candidat(s) accepté(s) avec succès`,
      totalAccepted: validEvaluations.length,
      successful: bulkResult.modifiedCount,
      emailStatus: 'processing_background',
      estimatedEmailTime: `${Math.ceil(validEvaluations.length / 10)} minutes`,
      timestamp: new Date().toISOString()
    });

    // 🔥 PHASE 2: Background password generation + email sending
    setImmediate(async () => {
      // console.log(`📧 Starting background processing for ${validEvaluations.length} candidates...`);
      
      const BATCH_SIZE = 10; // Process 10 candidates at a time
      let successful = 0;
      let failed = 0;
      const startTime = new Date();

      try {
        for (let i = 0; i < validEvaluations.length; i += BATCH_SIZE) {
          const batch = validEvaluations.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(validEvaluations.length / BATCH_SIZE);
          
          // console.log(`⚡ Processing batch ${batchNumber}/${totalBatches} (${batch.length} candidates)`);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (evaluation) => {
            try {
              const candidate = evaluation.candidate;
              
              // Generate password
              const plainPassword = generateRandomPassword();
              const hashedPassword = await bcrypt.hash(plainPassword, 8);
              
              // Update candidate with password
              await User.findByIdAndUpdate(candidate._id, {
                password: hashedPassword,
                $unset: { passwordPending: 1 }
              });

              // Prepare and send email
              const emailTemplate = createAccountEmailTemplate({
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
                password: plainPassword
              });

              await sendNotification({
                email: candidate.email,
                subject: emailTemplate.subject,
                htmlContent: emailTemplate.htmlContent,
                attachments: emailTemplate.attachments
              });

              // console.log(`✅ Completed: ${candidate.firstName} ${candidate.lastName} (${candidate.email})`);
              return { success: true, candidate: candidate._id };

            } catch (error) {
              console.error(`❌ Failed: ${evaluation.candidate.firstName} ${evaluation.candidate.lastName}`, error.message);
              
              // Remove passwordPending flag even on failure
              try {
                await User.findByIdAndUpdate(evaluation.candidate._id, {
                  $unset: { passwordPending: 1 }
                });
              } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError.message);
              }
              
              return { success: false, error: error.message, candidate: evaluation.candidate._id };
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
          const progress = Math.round(((i + batch.length) / validEvaluations.length) * 100);
          // console.log(`📊 Progress: ${progress}% (${successful} successful, ${failed} failed)`);
          
          // Small delay between batches to avoid overwhelming email service
          if (i + BATCH_SIZE < validEvaluations.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // console.log(`🎯 Background processing completed in ${duration}s`);
        // console.log(`📈 Final results: ${successful} successful, ${failed} failed`);
        // console.log(`✨ All done! Processed by: AzizHasnaoui at ${endTime.toISOString()}`);

      } catch (backgroundError) {
        // console.error('💥 Background processing failed:', backgroundError);
      }
    });

  } catch (error) {
    // console.error('❌ Error in bulk acceptance:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'acceptation des candidats.',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export const updatePupitre = async (req, res) => {
  const { userId } = req.params;
  const { pupitre } = req.body;

  const validPupitres = ["soprano", "alto", "ténor", "basse"];
  if (!validPupitres.includes(pupitre)) {
    return res.status(400).json({ message: "Valeur de pupitre invalide." });
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "choriste") {
      return res.status(404).json({ message: "Choriste non trouvé." });
    }

    user.pupitre = pupitre;
    await user.save();

    // ✅ Notify the user by email using templated structure
    const emailData = createPupitreUpdatedEmailTemplate(user);

    await sendNotification({
      email: user.email,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      attachments: emailData.attachments || [],
    });

    res.status(200).json({ message: "Pupitre mis à jour avec succès.", user });
  } catch (error) {
    console.error("Erreur mise à jour pupitre:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getActiveChoristes = async (req, res) => {
  try {
    const excludedStatuses = ["Inactif", "En congé", "éliminé"];

    const choristes = await User.find({
      role: "choriste",
      status: { $nin: excludedStatuses },
    }).select("email lastName firstName pupitre gender"); // ← on ajoute “gender”

    res.status(200).json(choristes);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des choristes actifs:",
      error
    );
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des choristes.",
    });
  }
};


export const getScheduledCandidatesWithSlots = async (req, res) => {
  try {
    const { date, timeRange } = req.query;

    // Base pipeline to get scheduled candidates with their slots
    const pipeline = [
      {
        $match: {
          role: "candidate",
          memberstatus: "TestScheduled",
          isAuditioned: { $ne: true }, // Only non-auditioned scheduled candidates
        },
      },
      {
        $lookup: {
          from: "auditionslots", // Collection name for AuditionSlot
          localField: "_id",
          foreignField: "candidate",
          as: "auditionSlot",
        },
      },
      {
        $unwind: {
          path: "$auditionSlot",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    // Add date filter if provided
    if (date) {
      const filterDate = new Date(date);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      pipeline.push({
        $match: {
          "auditionSlot.date": {
            $gte: filterDate,
            $lt: nextDay,
          },
        },
      });
    }

    // Add time range filter if provided
    if (timeRange) {
      const [startTime, endTime] = timeRange.split("-");
      pipeline.push({
        $match: {
          "auditionSlot.startTime": startTime,
          "auditionSlot.endTime": endTime,
        },
      });
    }

    // Project the fields we need
    pipeline.push({
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        gender: 1,
        birthDate: 1,
        nationality: 1,
        cin: 1,
        height: 1,
        professionalSituation: 1,
        phone: 1,
        motivation: 1,
        isActiveInOtherChoir: 1,
        hasMusicalKnowledge: 1,
        musicalExperience: 1,
        otherChoir: 1,
        sponsorName: 1,
        isSponsored: 1,
        phoneCountryCode: 1,
        auditionDate: "$auditionSlot.date",
        auditionStartTime: "$auditionSlot.startTime",
        auditionEndTime: "$auditionSlot.endTime",
      },
    });

    const candidates = await User.aggregate(pipeline);

    return res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching scheduled candidates with slots:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch scheduled candidates." });
  }
};

export const getAvailableTimeSlots = async (req, res) => {
  try {
    // Get all unique time slots from scheduled candidates
    const timeSlots = await AuditionSlot.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "candidate",
          foreignField: "_id",
          as: "candidateData",
        },
      },
      {
        $unwind: "$candidateData",
      },
      {
        $match: {
          "candidateData.memberstatus": "TestScheduled",
        },
      },
      {
        $group: {
          _id: {
            startTime: "$startTime",
            endTime: "$endTime",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          value: { $concat: ["$_id.startTime", "-", "$_id.endTime"] },
          label: { $concat: ["$_id.startTime", " - ", "$_id.endTime"] },
          startTime: "$_id.startTime",
          endTime: "$_id.endTime",
          candidateCount: "$count",
        },
      },
      {
        $sort: { startTime: 1 },
      },
    ]);

    return res.status(200).json(timeSlots);
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return res.status(500).json({ message: "Failed to fetch time slots." });
  }
};

export const getAvailableDates = async (req, res) => {
  try {
    // Get all unique dates from scheduled candidates
    const dates = await AuditionSlot.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "candidate",
          foreignField: "_id",
          as: "candidateData",
        },
      },
      {
        $unwind: "$candidateData",
      },
      {
        $match: {
          "candidateData.memberstatus": "TestScheduled",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          value: "$_id",
          label: {
            $dateToString: {
              format: "%d/%m/%Y",
              date: { $dateFromString: { dateString: "$_id" } },
            },
          },
          candidateCount: "$count",
        },
      },
      {
        $sort: { value: 1 },
      },
    ]);

    return res.status(200).json(dates);
  } catch (error) {
    console.error("Error fetching dates:", error);
    return res.status(500).json({ message: "Failed to fetch dates." });
  }
};


