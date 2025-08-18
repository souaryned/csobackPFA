import mongoose from "mongoose";

const repetitionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: { type: String, required: true },
  concert: { type: mongoose.Schema.Types.ObjectId, ref: "Concert" },
  presentChoristes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }
  ],
  absentChoristes: [
    {
      choriste: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String },
    },
  ],

    pupitres: [
    {
      type: String,
      enum: ["soprano", "alto", "ténor", "basse"],
    },
  ],

  // ✅ ADD: Manual presence management by chef de pupitre
  manualPresences: [{
    choriste: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    }, // Chef who added it
    reason: { 
      type: String, 
      required: true,
      trim: true
    },
    type: { 
      type: String, 
      enum: ['present', 'absent'], 
      required: true 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],



  notifiedDayBefore: {
    type: Boolean,
    default: false,
  },
  notifiedTwoHoursBefore: {
    type: Boolean,
    default: false,
  },

  // ✅ NEW: Pupitre-specific modifications by chefs
  pupitreModifications: [{
    chefDePupitre: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    pupitre: { 
      type: String, 
      enum: ['soprano', 'alto', 'ténor', 'basse'],
      required: true 
    },
    modifications: {
      newStartTime: { type: String },
      newEndTime: { type: String }, 
      newLocation: { type: String },
      urgentMessage: { type: String },
      reason: { type: String }
    },
    originalValues: {
      startTime: { type: String },
      endTime: { type: String },
      location: { type: String }
    },
    notificationsSent: { type: Boolean, default: false },
    modifiedAt: { type: Date, default: Date.now }
  }],
    // pupitres: [{
  //   name: {
  //     type: String,
  //     enum: ["soprano", "alto", "ténor", "basse"],
  //     required: true
  //   },
  //   // participationRate: {
  //   //   type: Number,
  //   //   min: 0,
  //   //   max: 100,
  //   //   default: 100 // 100% par défaut
  //   // }
  // }],
  
}, { timestamps: true });

export default mongoose.model("Repetition", repetitionSchema);