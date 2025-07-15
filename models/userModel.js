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
    required: false,
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
    required: false,
  },

  role: {
    type: String,
    enum: [
      "candidate",
      "choriste",
      "manager",
      "chef du pupitre",
      "chef de choeur",
      "admin",
    ],
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
    required: false,
  },

  previousStatus: {
  type: String,
  enum: ["Inactif", "Junior", "Sénior", "Vétéran", "éliminé"],
  default: null
},
  memberstatus: {
    type: String,
    enum: ["Pending", "TestScheduled", "Accepted", "Refused"],
    required:false
  },
  
  testDate: { type: Date, default: null },
  pupitre: {
    type: String,
    enum: ["soprano", "alto", "ténor", "basse"],
    required: false,
  },

  motivation: {
    type: String, // Why join the choir
    required: function () {
      return this.isNew && this.role === "candidate";
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


emailConfirmed: {
  type: Boolean,
  default: false,
},

emailConfirmationToken: {
  type: String,
  default: null,
},

emailConfirmationTokenExpires: {
  type: Date,
  default: null,
},




});

export default mongoose.model("User", userSchema);
