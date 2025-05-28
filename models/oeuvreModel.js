import mongoose from "mongoose";

const oeuvreSchema = new mongoose.Schema({
  title: { type: String, required: true },
  composers: [{ type: String, required: true }],
  arrangers: [{ type: String }],
  year: { type: String, required: true },
  genre: { type: String, required: true },
  lyrics: String,
  partition: String, // can be a filename or link
  requiresChoir: { type: Boolean, required: true },
}, { timestamps: true });

export default mongoose.model("Oeuvre", oeuvreSchema);
