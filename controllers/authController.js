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
    // Step 1: Check if the email or CIN already exists
    const existingUser = await User.findOne({ $or: [{ email }, { cin }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "L'email ou le CIN existe déjà dans le système" });
    }

    // Step 2: Create a new user with a "Pending" status
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
      musicalExperience,
      isActiveInOtherChoir,
      otherChoir,
      professionalSituation,
      phone,
      motivation,
      status: "Inactif",
      role: "choriste", // Default role for applicants
      memberstatus: "Pending", // Application status
      isLocked: true,
    });

    await newUser.save();

    // Step 3: Respond with success
    return res
      .status(201)
      .json({ message: "Votre demande d'adhésion a été soumise avec succès." });
  } catch (error) {
    console.error("Error in applyForMembership:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

