import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  gender: {
    type: String,
    enum: ["Homme", "Femme"],
    required: function () {
      return this.role === "choriste";
    },
  },
  birthDate: {
    type: String,
    required: function () {
      return this.role === "choriste";
    },
  },
  nationality: {
    type: String,
    required: function () {
      return this.role === "choriste";
    },
  },
  cin: {
    type: String,
    unique: true,
    sparse: true,
    required: function () {
      return this.role === "choriste";
    },
  },
  height: {
    type: Number,
    required: function () {
      return this.role === "choriste";
    },
  },

  hasMusicalKnowledge: {
    type: Boolean,
    required: function () {
      return this.role === "choriste";
    },
  },

  hasInstrumentalKnowledge: {
    type: Boolean,
    required: function () {
      return this.role === "choriste";
    },
  },

  phone: {
    type: String,
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
      "Choriste",
      "éliminé",
    ],
    required: function () {
      return this.role === "choriste";
    },
  },

  pupitre: {
    type: String,
    enum: ["soprano", "alto", "ténor", "basse"],
    required: function () {
      return this.role === "choriste";
    },
  },

  // historiqueStatut: [
  //   {
  //     saison: { type: mongoose.Schema.Types.ObjectId, ref: "Saison" },
  //     status: String
  //   }
  // ],

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
    default: null
  }
  // notifications: {
  //   type: Array,
  //   default: []
  // }
});

export default mongoose.model("User", userSchema);
