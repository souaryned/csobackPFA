import mongoose from "mongoose";

const oeuvreSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true },
    composers:     [{ type: String, required: true }],
    arrangers:     [{ type: String }],
    year:          { type: String, required: true },
    genre:         { type: String, required: true },
    lyrics:        { type: String, default: "" },   // PDF paroles
    partition:     { type: String, default: "" },   // PDF partition
    video:         { type: String, default: "" },   // mp4
    audio:         { type: String, default: "" },   // mp3 / wav
    requiresChoir: { type: Boolean, required: true },
    isVisible:     { type: Boolean, default: true },// masquer / afficher
  },
  { timestamps: true }
);

export default mongoose.model("Oeuvre", oeuvreSchema);