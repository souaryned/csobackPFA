import mongoose from "mongoose";

const auditionEvaluationSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  auditionSlot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuditionSlot", 
    required: true
  },

  // Automatically set based on candidate's gender
  tessiture: {
    type: String,
    enum: ["Ténor", "Basse", "Soprano", "Alto"],
    required: true
  },

  oeuvreChante: {
    type: String,
    required: true,
    trim: true
  },

  remarque: {
    type: String,
    default: "",
    trim: true
  },

  note: {
    type: String,
    enum: ["A+", "A", "B+", "B*", "B-", "B", "C", "D"],
    required: true
  },

  ordrePassage: {
    type: Number,
    required: false,
    min: 1
  },

  decision: {
    type: String,
    enum: ["Retenu", "Non Retenu", "En Attente"],
    required: true
  },

  // Who evaluated this candidate
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  evaluatedAt: {
    type: Date,
    default: Date.now
  },

  // Track if this has been modified
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, {
  timestamps: true
});

// Ensure one evaluation per candidate per audition slot
auditionEvaluationSchema.index({ candidate: 1, auditionSlot: 1 }, { unique: true });

export default mongoose.model("AuditionEvaluation", auditionEvaluationSchema);