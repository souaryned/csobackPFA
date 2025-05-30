import User from "../../models/userModel.js";
import bcrypt from "bcrypt";
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { createAccountEmailTemplate, createRejectionEmailTemplate } from "../../tools/mail/notifTemplate.js";

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

    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "User already exists." });
    }

    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const userData = {
      firstName,
      lastName,
      email,
      role,
      phone, // ✅ always included
      password: hashedPassword,
    };

    if (role === "choriste") {
      Object.assign(userData, {
        gender,
        birthDate,
        nationality,
        cin,
        height,
        hasMusicalKnowledge,
        hasInstrumentalKnowledge,
        pupitre,
      });
    }

    const newUser = new User(userData);
    await newUser.save();

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

    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error." });
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

export const getMembershipSubmissions = async (req, res) => {
  try {
    // Find all users who are choristes and their memberstatus is "Pending" (or all statuses if you want)
    const submissions = await User.find(
      { role: "choriste", memberstatus: "Pending" },
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
      }
    );

    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching membership submissions:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch membership submissions." });
  }
};

export const acceptMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.role !== 'choriste') {
      return res.status(404).json({ message: 'Choriste not found.' });
    }

    // Generate password
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update user fields
    user.isLocked = false;
    user.memberstatus = 'Accepted';
    user.password = hashedPassword;
    user.status = 'Junior'

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

    if (!user || user.role !== "choriste") {
      return res.status(404).json({ message: "Choriste not found." });
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

    res.status(200).json({ message: "Membership refused, user notified and deleted." });
  } catch (error) {
    console.error("Error refusing membership:", error);
    res.status(500).json({ message: "Failed to refuse membership." });
  }
};

export const getAcceptedMemberships = async (req, res) => {
  try {
    const acceptedMembers = await User.find(
      { role: "choriste", memberstatus: "Accepted" },
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
    res
      .status(500)
      .json({ message: "Failed to fetch accepted choristes." });
  }
};




