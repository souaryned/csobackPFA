import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true }, // Remove min length, only alphabets
  lastName: { type: String, required: true }, // Remove min length, only alphabets

  email: { type: String, unique: true, required: true },
  password: { type: String, required: false },

  gender: {
    type: String,
    enum: ["Homme", "Femme"],
    required: false,
  },
  birthDate: {
    type: String,
    required: false,
  },
  nationality: {
    type: String, // Will now be country from dropdown
    required: false,
  },

  // NEW: Change CIN to identity document type
  identityType: {
    type: String,
    enum: ["CIN", "Passeport"],
    required: false
  },
  
  // UPDATED: Identity number (CIN or Passport)
  identityNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: false  // Fixed typo: was "requred"
  },

  height: {
    type: Number,
    required: false,
  },

  // NEW: Sponsorship fields
  isSponsored: {
    type: Boolean,
    required: false
  },
  sponsorName: {
    type: String, // Sponsor's full name
    required: false
  },

  // MOVED to Step 3: Musical knowledge
  hasMusicalKnowledge: {
    type: Boolean,
    required: false,
  },
  musicalExperience: {
    type: String,
    default: "",
  },

  // MOVED to Step 3: Other choir
  isActiveInOtherChoir: {
    type: Boolean,
    required: false,
  },
  otherChoir: {
    type: String,
    default: "",
  },

  // UPDATED: Professional situation (now text field)
  professionalSituation: {
    type: String,
    default: "",
  },

  // UPDATED: International phone with country code
  phone: {
    type: String,
    required: false,
  },
  phoneCountryCode: {
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
    required: false
  },

 isAuditioned: {
    type: Boolean,
    default: false
  },
  auditionnedAt: {
    type: Date,
    default: null
  },
  
  // ✅ ADD THIS: canReapply field
  canReapply: {
    type: Boolean,
    default: false,
    required: false
  },
  
  testDate: { type: Date, default: null },
  pupitre: {
    type: String,
    enum: ["soprano", "alto", "ténor", "basse"],
    required: false,
  },

  motivation: {
    type: String,
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
    type: String,
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
  convocationStatus: {
    type: String,
    enum: ["Sent", "Confirmed", "Declined", "RescheduleRequested","RescheduledSameDay"],
    required: false
  },

  // 🎯 NEW: Convocation response deadline (48 hours from email sent)
  convocationDeadline: {
    type: Date,
    required: false
  },

  // 🎯 NEW: When candidate responded to convocation
  convocationResponseDate: {
    type: Date,
    required: false
  },
  convocationStatus: {
  type: String,
  enum: ["Sent", "Confirmed", "Declined", "RescheduleRequested", "RescheduledSameDay"],
  default: "Sent",
  required: true
},

// Add this field for same-day reschedule requests
requestedNewTime: { 
  type: String, 
  required: false 
},
// Add to User model
reminderSent: {
  type: Boolean,
  default: false
},
reminderSentDate: {
  type: Date
}
});

export default mongoose.model("User", userSchema);