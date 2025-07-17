import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { JWT_SECRET } from "../config.js";
import crypto from "crypto";
import { sendNotification } from "../tools/mail/mailNotif.js";
import { generateEmailTemplate } from "../tools/mail/notifTemplate.js"; // Adjust path if needed

///////////////////////// LOGIN (All roles) /////////////////////////
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (existingUser.isLocked) {
      return res.status(403).json({ message: "Account is locked." });
    }

    const token = jwt.sign(
      { userId: existingUser._id, role: existingUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: existingUser._id,
        fullName: `${existingUser.firstName} ${existingUser.lastName}`,
        role: existingUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

///////////////////////// SIGNUP (Admin only) /////////////////////////
export const signupAdmin = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();

    return res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean(); // ✅ full DB fetch

    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    res.json({
      ...user,
      fullName: `${user.firstName} ${user.lastName}`, // ✅ Add this if not already set
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateMe = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(req.auth.userId, updates, {
      new: true,
      runValidators: true,
    }).lean();

    res.json({ message: "Profil mis à jour", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

///////////////////////// APPLY FOR MEMBERSHIP /////////////////////////
export const applyForMembership = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    gender,
    birthDate,
    nationality,
    identityType,
    identityNumber,
    height,
    hasMusicalKnowledge,
    musicalExperience,
    isActiveInOtherChoir,
    otherChoir,
    professionalSituation,
    phone,
    phoneCountryCode,
    isSponsored,
    sponsorName,
    motivation,
  } = req.body;

  try {
    // 1. Find the user by email (created at confirmation step)
    const userByEmail = await User.findOne({ email });

    // 2. If no user was found with the confirmed email
    if (!userByEmail) {
      return res.status(400).json({
        message: "Email non confirmé ou inexistant. Veuillez d'abord confirmer votre email.",
      });
    }

    // 3. Check if identity number is already used by another user (not this one)
    // Check both new identityNumber field and old cin field for compatibility
    const userByIdentity = await User.findOne({ 
      $or: [
        { identityNumber }, 
        { cin: identityNumber }
      ],
      _id: { $ne: userByEmail._id } // Exclude current user
    });

    if (userByIdentity) {
      return res.status(400).json({ 
        message: `Le numéro de ${identityType} que vous avez introduit existe. Vous avez donc déjà postulé au choeur du CSO, nous vous contacterons bientôt` 
      });
    }

    // 4. Update the existing user's information
    userByEmail.firstName = firstName;
    userByEmail.lastName = lastName;
    userByEmail.gender = gender;
    userByEmail.birthDate = birthDate;
    userByEmail.nationality = nationality;
    userByEmail.identityType = identityType;
    userByEmail.identityNumber = identityNumber;
    userByEmail.height = height;
    
    // Convert radio button values to boolean for musical knowledge
    userByEmail.hasMusicalKnowledge = hasMusicalKnowledge === 'oui';
    userByEmail.musicalExperience = hasMusicalKnowledge === 'oui' ? (musicalExperience || "") : "";
    
    // Convert radio button values to boolean for other choir
    userByEmail.isActiveInOtherChoir = isActiveInOtherChoir === 'oui';
    userByEmail.otherChoir = isActiveInOtherChoir === 'oui' ? (otherChoir || "") : "";
    
    userByEmail.professionalSituation = professionalSituation || "";
    userByEmail.phone = phone || "";
    userByEmail.phoneCountryCode = phoneCountryCode || "";
    
    // Convert radio button values to boolean for sponsorship
    userByEmail.isSponsored = isSponsored === 'oui';
    userByEmail.sponsorName = isSponsored === 'oui' ? (sponsorName || "") : "";
    
    userByEmail.motivation = motivation;
    userByEmail.status = "Inactif";
    userByEmail.role = "candidate";
    userByEmail.memberstatus = "Pending";
    userByEmail.isLocked = true;
    userByEmail.testDate = null;

    // Remove old cin field if it exists (migration)
    // if (userByEmail.cin) {
    //   userByEmail.cin = undefined;
    // }

    await userByEmail.save();

  
    return res.status(200).json({ message: "Candidature soumise avec succès." });
  } catch (error) {
    console.error("Error in applyForMembership:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

export const sendEmailConfirmation = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email manquant." });
  }

  try {
    const existingUser = await User.findOne({ email });

    // ❌ Email already in use
    if (existingUser) {
      return res.status(400).json({
        message: "Vous avez déjà postulé au choeur du CSO, nous vous contacterons bientôt",
      });
    }

    // ✅ Create temporary user for confirmation process
    const user = await User.create({
      email,
      firstName: "En attente",
      lastName: "En attente",
      motivation: "En attente de saisie",
      emailConfirmed: false,
      role: "candidate",
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.emailConfirmationToken = token;
    user.emailConfirmationTokenExpires = expires;
    await user.save();

    const confirmLink = `http://localhost:3000/confirm-email?token=${token}`;

    // 🔥 Use the styled template here
    const htmlContent = generateEmailTemplate(
      "Confirmez votre adresse email",
      `<p style="font-size: 18px; font-weight: 500;">Bienvenue dans le processus de candidature au CSO 🎶</p>`,
      `
        <p>Nous avons bien reçu votre adresse email <strong>${email}</strong>.</p>
        <p>Pour poursuivre votre candidature, veuillez cliquer sur le lien ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}" style="background: #5a3e2b; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Confirmer mon email
          </a>
        </div>
        <p>Ce lien est valable pendant <strong>1 heure</strong>.</p>
        <p>Si vous n'avez pas demandé cette confirmation, vous pouvez ignorer ce message.</p>
      `
    );

    await sendNotification({
      email: user.email,
      subject: "Confirmez votre adresse email",
      htmlContent,
      attachments: [
        {
          filename: "music.png",
          path: "./tools/assets/images/music.png",
          cid: "logo", 
        },
      ],
    });

    res.status(200).json({ message: "Email de confirmation envoyé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
};


export const checkEmailConfirmed = async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ emailConfirmed: false });
    return res.json({ emailConfirmed: user.emailConfirmed || false });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const confirmEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).send("Token manquant");

  try {
    const user = await User.findOne({
      emailConfirmationToken: token,
      emailConfirmationTokenExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).send("Lien invalide ou expiré");

    user.emailConfirmed = true;
    user.emailConfirmationToken = undefined;
    user.emailConfirmationTokenExpires = undefined;
    await user.save();

    res.send(
      "Email confirmé avec succès. Vous pouvez retourner au formulaire."
    );
  } catch (err) {
    res.status(500).send("Erreur serveur");
  }
};
