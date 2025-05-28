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
    
  },
  { timestamps: true }
);

export default mongoose.model("Concert", concertSchema);
