import User from "../../models/userModel.js";
import bcrypt from "bcrypt";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import {
  createAccountEmailTemplate,
  createPupitreUpdatedEmailTemplate,
  createRejectionEmailTemplate,
  createTestDateEmailTemplate,
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
        return res.status(400).json({ message: "CIN is required for choriste." });
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
      role: { $nin: ["admin"] },
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
    // read `status` from query string; default to Pending
    const status = req.query.status || "Pending";

    const submissions = await User.find(
      { role: "candidate", memberstatus: status },
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
        motivation: 1,
        isActiveInOtherChoir: 1,
        hasMusicalKnowledge: 1,
        musicalExperience: 1,
        otherChoir: 1,
        testDate: 1      // ← include the assigned test date
      }
    );

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
    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    // Generate password
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update user fields
    user.isLocked = false;
    user.memberstatus = 'Accepted';
    user.password = hashedPassword;
    user.status = 'Junior'
    user.role = 'choriste'; // Ensure role is set to choriste

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

    res.status(200).json({ message: 'Membership accepted and credentials sent.' });
  } catch (error) {
    console.error('Error accepting membership:', error);
    res.status(500).json({ message: 'Failed to accept membership.' });
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

    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found.' });
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

export const sendTestDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const datesArray = [];
    const current = new Date(start);
    while (current <= end) {
      datesArray.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    const candidates = await User.find({
      role: "candidate",
      memberstatus: "Pending",
    });
    for (const candidate of candidates) {
      const idx = Math.floor(Math.random() * datesArray.length);
      const assignedDate = datesArray[idx];
      candidate.testDate = assignedDate;
      candidate.memberstatus = "TestScheduled";
      await candidate.save();
      const emailData = createTestDateEmailTemplate({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        assignedDate,
      });
      await sendNotification({
        email: candidate.email,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        attachments: emailData.attachments,
      });
    }
    return res.status(200).json({ message: "Dates de test envoyées." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur lors de l’envoi des dates." });
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

