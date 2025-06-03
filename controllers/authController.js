import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { JWT_SECRET } from "../config.js";

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
    console.error("Login error:", error);
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
    console.error("Signup error:", error);
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
    cin,
    height,
    hasMusicalKnowledge,
    musicalExperience,
    isActiveInOtherChoir,
    otherChoir,
    professionalSituation,
    phone,
    motivation,
  } = req.body;

  try {
    // 1. Vérifier que l'email ou le CIN n'existe pas déjà
    const existingUser = await User.findOne({ $or: [{ email }, { cin }] });
    if (existingUser) {
      return res.status(400).json({
        message: "L'email ou le CIN existe déjà dans le système",
      });
    }

    // 2. Créer un nouvel utilisateur avec role = "candidate" et memberstatus = "Pending"
    const newUser = new User({
      firstName,
      lastName,
      email,
      gender,
      birthDate,
      nationality,
      cin,
      height,
      hasMusicalKnowledge,
      musicalExperience: musicalExperience || "",
      isActiveInOtherChoir,
      otherChoir: otherChoir || "",
      professionalSituation: professionalSituation || "",
      phone: phone || "",
      motivation,
      status: "Inactif",          // Le candidat n'est pas encore choriste actif
      role: "candidate",          // Nouveau rôle réservé aux candidats
      memberstatus: "Pending",    // En attente de programmation de test
      isLocked: true,             // Compte verrouillé jusqu'à la convocation au test
      testDate: null,             // À remplir plus tard lors de l'envoi des dates de test
    });

    await newUser.save();

    // 3. Répondre avec succès
    return res
      .status(201)
      .json({ message: "Votre demande d'adhésion a été soumise avec succès." });
  } catch (error) {
    console.error("Error in applyForMembership:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

