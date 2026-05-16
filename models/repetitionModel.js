import mongoose from "mongoose";

const repetitionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true },

    concert: { type: mongoose.Schema.Types.ObjectId, ref: "Concert" },

    presentChoristes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
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

    manualPresences: [
      {
        choriste: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: { type: String, required: true, trim: true },
        type: {
          type: String,
          enum: ["present", "absent"],
          required: true,
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // ✅ Rappels personnalisés — PLUSIEURS par choriste supportés
    // Un choriste peut avoir [10 min, 1h, veille] pour la même répétition
    choristeReminders: [
      {
        choriste: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        minutesBefore: {
          type: Number,
          required: true,
          min: 1,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: {
          type: Date,
          default: null,
        },
      },
    ],

    remindersSent: {
      dayBefore: { type: Boolean, default: false },
      twoHours: { type: Boolean, default: false },
      tenMinutes: { type: Boolean, default: false },
    },

    managerModifications: [
      {
        manager: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        modifications: {
          newStartTime: { type: String },
          newEndTime: { type: String },
          newLocation: { type: String },
          urgentMessage: { type: String },
          reason: { type: String },
        },
        originalValues: {
          startTime: { type: String },
          endTime: { type: String },
          location: { type: String },
        },
        notificationsSent: { type: Boolean, default: false },
        modifiedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

repetitionSchema.index({ "choristeReminders.sent": 1, date: 1 });
repetitionSchema.index({ "choristeReminders.choriste": 1 });

export default mongoose.model("Repetition", repetitionSchema);
