import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true }, // Prénom
  lastName: { type: String, required: true }, // Nom

  email: { type: String, unique: true, required: true },
  password: { type: String, required: false },

  gender: {
    type: String,
    enum: ["Homme", "Femme"],
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  birthDate: {
    type: String,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  nationality: {
    type: String,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  cin: {
    type: String,
    unique: true,
    sparse: true,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  height: {
    type: Number,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },

  hasMusicalKnowledge: {
    type: Boolean,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  musicalExperience: {
    type: String, // Description of musical knowledge/experience
    default: "", // Optional text field
  },

  isActiveInOtherChoir: {
    type: Boolean,
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },
  otherChoir: {
    type: String, // Name of another choir, if applicable
    default: "",
  },

  professionalSituation: {
    type: String, // Name of professionalSituation, if applicable
    default: "",
  },

  phone: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["choriste", "manager", "chef du pupitre", "chef de choeur", "admin"],
    required: true,
  },

  status: {
    type: String,
    enum: [
      "Inactif",
      "Junior",
      "Sénior",
      "Vétéran",
      "En congé",
      "éliminé",
      // "Choriste"
    ],
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },

  memberstatus: {
    type: String,
    enum: [
      "Pending", // Application submitted, awaiting review
      "Accepted", // Application approved by admin
      "Refused", // Application rejected by admin
    ],
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },

  pupitre: {
    type: String,
    enum: ["soprano", "alto", "ténor", "basse"],
    required: false,
  },

  motivation: {
    type: String, // Why join the choir
    required: function () {
      return this.isNew && this.role === "choriste";
    },
  },

  isLocked: {
    type: Boolean,
    default: false,
  },

  isChoristeLocked: {
    type: Boolean,
    default: false,
  },

  avatar: {
    type: String, // e.g., "/uploads/avatars/123.jpg"
    default: null,
  },

  rejectionReason: {
    type: String,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", userSchema);
