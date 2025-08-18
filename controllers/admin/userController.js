import User from "../../models/userModel.js";
import AuditionEvaluation from "../../models/auditionEvaluation.js"; // Add this import
import AuditionSlot from "../../models/auditionSlotModel.js";

import bcrypt from "bcrypt";
import crypto from 'crypto';
import { sendNotification } from "../../tools/mail/mailNotif.js";
import {
  createAccountEmailTemplate,
  createPupitreUpdatedEmailTemplate,
  createRejectionEmailTemplate,
  charterSigningInvitationTemplate,
  createChefPupitreNotificationTemplate,
  createNewChefPupitreNotificationTemplate
} from "../../tools/mail/notifTemplate.js";

import {FRONTEND_URL} from "../../config.js"

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
      phone,
    } = req.body;

    // 1) Required fields validation
    if (!firstName || !lastName || !email || !role || !phone) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    // 2) Check for duplicate email
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      return res.status(409).json({ message: "Email existe deja." });
    }

    // 3) Validate role (only manager and chef de choeur allowed)
    if (!["manager", "chef de choeur"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    // 4) Generate and hash password
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 5) Create user data (simplified - no choriste fields)
    const userData = {
      firstName,
      lastName,
      email,
      role,
      phone,
      password: hashedPassword,
    };

    // 6) Save to database
    const newUser = new User(userData);
    await newUser.save();

    // 7) Send account creation email
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
      phone,
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

    // 3. Validate role (only manager and chef de choeur allowed)
    if (!["manager", "chef de choeur"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    // 4. Build simplified update payload
    const setPayload = {
      firstName,
      lastName,
      email,
      role,
      phone,
    };

    // 5. Build unset payload to remove any choriste-specific fields
    const unsetPayload = {
      gender: "",
      birthDate: "",
      nationality: "",
      cin: "",
      height: "",
      hasMusicalKnowledge: "",
      hasInstrumentalKnowledge: "",
      pupitre: "",
      status: "",
    };

    // 6. Apply update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: setPayload, $unset: unsetPayload },
      { new: true, runValidators: true }
    );

    // 7. If email changed, send notification
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

// ✅ UPDATED: New charter-based acceptance process
export const acceptRetenuCandidates = async (req, res) => {
  try {
    // Find candidates to process
    const retenuEvaluations = await AuditionEvaluation.find({
      decision: 'Retenu'
    }).populate({
      path: 'candidate',
      match: { 
        role: 'candidate', 
        memberstatus: { $ne: 'Accepted' },
        charterSigned: { $ne: true } // Only candidates who haven't signed charter yet
      },
      select: 'firstName lastName email role memberstatus isLocked status charterSigned pendingCharterSignature'
    });

    const validEvaluations = retenuEvaluations.filter(evalu => evalu.candidate !== null);

    if (validEvaluations.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Aucun candidat retenu trouvé ou tous ont déjà signé la charte.'
      });
    }

    // console.log(`🚀 Processing ${validEvaluations.length} candidates for charter signing - Started by: aziizhasnaoui at ${new Date().toISOString()}`);

    // 🚀 PHASE 1: Generate charter signing tokens and update status
    const charterUpdates = validEvaluations.map(evaluation => {
      const charterToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      return {
        updateOne: {
          filter: { _id: evaluation.candidate._id },
          update: {
            pendingCharterSignature: true,
            charterSigningToken: charterToken,
            charterSigningTokenExpires: tokenExpires,
            // ✅ REMOVED: acceptedAt and acceptedBy fields
            // Don't change memberstatus yet - will be changed after charter signing
          }
        }
      };
    });

    // ⚡ INSTANT: Bulk update all candidates
    const bulkResult = await User.bulkWrite(charterUpdates);

    // 🎯 IMMEDIATE RESPONSE
    res.status(200).json({
      success: true,
      message: `${validEvaluations.length} candidat(s) - Invitation à signer la charte envoyée`,
      totalProcessed: validEvaluations.length,
      successful: bulkResult.modifiedCount,
      emailStatus: 'processing_background',
      estimatedEmailTime: `${Math.ceil(validEvaluations.length / 10)} minutes`,
      timestamp: new Date().toISOString()
    });

    // 🔥 PHASE 2: Background charter invitation email sending
    setImmediate(async () => {
      // console.log(`📧 Starting background charter invitation processing for ${validEvaluations.length} candidates...`);
      
      const BATCH_SIZE = 10;
      let successful = 0;
      let failed = 0;
      const startTime = new Date();

      try {
        // Get updated candidates with tokens
        const updatedCandidates = await User.find({
          _id: { $in: validEvaluations.map(e => e.candidate._id) },
          pendingCharterSignature: true,
          charterSigningToken: { $exists: true }
        }).select('firstName lastName email charterSigningToken');

        for (let i = 0; i < updatedCandidates.length; i += BATCH_SIZE) {
          const batch = updatedCandidates.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(updatedCandidates.length / BATCH_SIZE);
          
          // console.log(`⚡ Processing charter invitation batch ${batchNumber}/${totalBatches} (${batch.length} candidates)`);
          
          const batchPromises = batch.map(async (candidate) => {
            try {
              const charterSigningLink = `${FRONTEND_URL}/charter/sign/${candidate.charterSigningToken}`;
              
              const emailTemplate = charterSigningInvitationTemplate({
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
                charterSigningLink
              });

              await sendNotification({
                email: candidate.email,
                subject: emailTemplate.subject,
                htmlContent: emailTemplate.htmlContent,
                attachments: emailTemplate.attachments
              });

              // console.log(`✅ Charter invitation sent: ${candidate.firstName} ${candidate.lastName} (${candidate.email})`);
              return { success: true, candidate: candidate._id };

            } catch (error) {
              console.error(`❌ Failed charter invitation: ${candidate.firstName} ${candidate.lastName}`, error.message);
              return { success: false, error: error.message, candidate: candidate._id };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
              successful++;
            } else {
              failed++;
            }
          });

          const progress = Math.round(((i + batch.length) / updatedCandidates.length) * 100);
          // console.log(`📊 Charter invitation progress: ${progress}% (${successful} successful, ${failed} failed)`);
          
          if (i + BATCH_SIZE < updatedCandidates.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // console.log(`🎯 Charter invitation processing completed in ${duration}s`);
        // console.log(`📈 Final results: ${successful} successful, ${failed} failed`);

      } catch (backgroundError) {
        console.error('💥 Charter invitation background processing failed:', backgroundError);
      }
    });

  } catch (error) {
    console.error('❌ Error in charter invitation process:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'envoi des invitations à signer la charte.',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ✅ NEW: Charter signing endpoint
export const signCharter = async (req, res) => {
  try {
    const { token } = req.params;
    const { signature } = req.body; // This could be just a boolean confirmation

    if (!token || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Token et signature requis.'
      });
    }

    // Find candidate with valid token
    const candidate = await User.findOne({
      charterSigningToken: token,
      charterSigningTokenExpires: { $gt: new Date() },
      pendingCharterSignature: true,
      charterSigned: false
    });

    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré.'
      });
    }

    // Generate account credentials
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 8);

    // Update candidate with charter signature and account activation
    await User.findByIdAndUpdate(candidate._id, {
      // Charter fields
      charterSigned: true,
      charterSignedAt: new Date(),
      charterSigningToken: null,
      charterSigningTokenExpires: null,
      pendingCharterSignature: false,
      
      // Account activation
      password: hashedPassword,
      role: 'choriste',
      memberstatus: 'Accepted',
      status: 'Junior',
      isLocked: false
    });

    // Send account credentials email
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

    // console.log(`✅ Charter signed and account activated: ${candidate.firstName} ${candidate.lastName}`);

    res.status(200).json({
      success: true,
      message: 'Charte signée avec succès ! Vos identifiants ont été envoyés par email.',
      candidateName: `${candidate.firstName} ${candidate.lastName}`
    });

  } catch (error) {
    console.error('❌ Error in charter signing:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la signature de la charte.',
      error: error.message
    });
  }
};

// ✅ NEW: Endpoint to display charter (GET)
export const getCharterForSigning = async (req, res) => {
  try {
    const { token } = req.params;

    const candidate = await User.findOne({
      charterSigningToken: token,
      charterSigningTokenExpires: { $gt: new Date() },
      pendingCharterSignature: true,
      charterSigned: false
    }).select('firstName lastName email');

    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré.'
      });
    }

    res.status(200).json({
      success: true,
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email
      }
    });

  } catch (error) {
    console.error('❌ Error fetching charter:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la charte.'
    });
  }
};

// ✅ UPDATED: updatePupitre endpoint with chef notifications
export const updatePupitre = async (req, res) => {
  try {
    const { userId } = req.params;
    const { pupitre } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Choriste introuvable' });
    }

    // ✅ Backend chef validation as safety net
    if (user.isChefDePupitre) {
      return res.status(400).json({ 
        message: 'Impossible de modifier la tessiture d\'un chef de pupitre. Retirez d\'abord son statut de chef.' 
      });
    }

    const oldPupitre = user.pupitre;
    const newPupitre = pupitre || null;

    // Update pupitre
    user.pupitre = newPupitre;
    await user.save();

    // ✅ INSTANT RESPONSE - Don't wait for emails
    res.status(200).json({
      message: newPupitre 
        ? `La tessiture de ${user.firstName} ${user.lastName} a été modifiée vers ${newPupitre}.`
        : `La tessiture de ${user.firstName} ${user.lastName} a été supprimée.`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        pupitre: user.pupitre
      }
    });

    // ✅ BACKGROUND EMAIL SENDING (fire & forget)
    setImmediate(async () => {
      try {
        // ✅ 1. NOTIFY THE CHORISTE THEMSELVES (the missing part!)
        if (oldPupitre !== newPupitre) {
          try {
            const emailData = createPupitreUpdatedEmailTemplate(user);

            await sendNotification({
              email: user.email,
              subject: emailData.subject,
              htmlContent: emailData.htmlContent,
              attachments: emailData.attachments || [],
            });

            // console.log(`✅ Choriste notified of their own pupitre change: ${user.firstName} ${user.lastName} (${user.email})`);
            
          } catch (emailError) {
            console.error(`❌ Failed to notify choriste of their own change:`, emailError);
          }
        }

        // Only send emails to chefs if there's an actual pupitre change and both old/new are valid pupitres
        const validPupitres = ['soprano', 'alto', 'ténor', 'basse'];
        
        if (oldPupitre && validPupitres.includes(oldPupitre) && oldPupitre !== newPupitre) {
          // ✅ 2. Notify OLD pupitre chefs (choriste LEAVING)
          try {
            const oldPupitreChefs = await User.find({
              role: 'choriste',
              pupitre: oldPupitre,
              isChefDePupitre: true,
              isLocked: false
            }).select('firstName lastName email');

            for (const chef of oldPupitreChefs) {
              const oldChefEmailData = createChefPupitreNotificationTemplate({
                chefFirstName: chef.firstName,
                chefLastName: chef.lastName,
                choristeName: `${user.firstName} ${user.lastName}`,
                chorisiteEmail: user.email,
                newPupitre: newPupitre || 'Non défini',
                oldPupitre: oldPupitre
              });
              
              await sendNotification({
                email: chef.email,
                subject: oldChefEmailData.subject,
                htmlContent: oldChefEmailData.htmlContent,
                attachments: oldChefEmailData.attachments || [],
              });
            }
            
            if (oldPupitreChefs.length > 0) {
              // console.log(`✅ Old pupitre chefs notified: ${oldPupitreChefs.length} chef(s) for ${oldPupitre}`);
            }
            
          } catch (emailError) {
            console.error(`❌ Failed to notify old pupitre chefs:`, emailError);
          }
        }

        if (newPupitre && validPupitres.includes(newPupitre) && oldPupitre !== newPupitre) {
          // ✅ 3. Notify NEW pupitre chefs (choriste JOINING)
          try {
            const newPupitreChefs = await User.find({
              role: 'choriste',
              pupitre: newPupitre,
              isChefDePupitre: true,
              isLocked: false
            }).select('firstName lastName email');

            for (const chef of newPupitreChefs) {
              const newChefEmailData = createNewChefPupitreNotificationTemplate({
                chefFirstName: chef.firstName,
                chefLastName: chef.lastName,
                choristeName: `${user.firstName} ${user.lastName}`,
                chorisiteEmail: user.email,
                newPupitre: newPupitre,
                oldPupitre: oldPupitre || 'Non défini'
              });
              
              await sendNotification({
                email: chef.email,
                subject: newChefEmailData.subject,
                htmlContent: newChefEmailData.htmlContent,
                attachments: newChefEmailData.attachments || [],
              });
            }
            
            if (newPupitreChefs.length > 0) {
              // console.log(`✅ New pupitre chefs notified: ${newPupitreChefs.length} chef(s) for ${newPupitre}`);
            }
            
          } catch (emailError) {
            console.error(`❌ Failed to notify new pupitre chefs:`, emailError);
          }
        }
        
      } catch (emailError) {
        console.error(`❌ Background email error for pupitre change:`, emailError);
      }
    });

  } catch (error) {
    console.error('Error updating pupitre:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la tessiture' });
  }
};

export const getActiveChoristes = async (req, res) => {
  try {
    const excludedStatuses = ["Inactif", "En congé", "éliminé"];

    const choristes = await User.find({
      role: "choriste",
      status: { $nin: excludedStatuses },
    }).select("email lastName firstName pupitre gender isChefDePupitre"); // ✅ ADD isChefDePupitre

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



// controllers/admin/repetitionController.js - ADD THIS FUNCTION:

// ✅ NEW: Get choristes by pupitre for manager filters
export const getChoristesByPupitre = async (req, res) => {
  try {
    const { pupitre } = req.query;

    // Build query
    let query = {
      role: 'choriste',
      isLocked: { $ne: true }
    };

    // Add pupitre filter if provided
    if (pupitre) {
      // Validate pupitre value
      const validPupitres = ['soprano', 'alto', 'ténor', 'basse'];
      if (!validPupitres.includes(pupitre)) {
        return res.status(400).json({ 
          message: 'Pupitre invalide. Options: ' + validPupitres.join(', ')
        });
      }
      query.pupitre = pupitre;
    }

    // Get choristes
    const choristes = await User.find(query)
      .select('firstName lastName email pupitre')
      .sort({ firstName: 1, lastName: 1 });

    res.json(choristes);

  } catch (error) {
    console.error('Error getting choristes by pupitre:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};