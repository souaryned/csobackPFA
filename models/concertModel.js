import mongoose from "mongoose";

const concertSchema = new mongoose.Schema(
  {
   title: {
      type: String,
      required: true,
      trim: true,
    },

    dateHeure: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    poster: {
      type: String, // Optional: image file name or URL
    },
    programme: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Oeuvre",
        required: true,
      },
    ],
    availableChoristes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    finalParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    absentChoristes: [{
      choriste: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { 
        type: String,
        enum: ['did_not_mark_disponibilite', 'removed_by_admin', 'removed_by_chef', 'manual_absence'],
        default: 'did_not_mark_disponibilite'
      },
      markedAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

export default mongoose.model("Concert", concertSchema);
