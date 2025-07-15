import mongoose from "mongoose";

const AuditionParamsSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  sessionStartTime: { type: String, required: true }, // e.g. "09:00"
  sessionEndTime: { type: String, required: true }, // e.g. "17:30"
  slotDurationMinutes: { type: Number, required: true, min: 1 },
  breakDurationMinutes: { type: Number, default: 0, min: 0 },
  candidateCount: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("AuditionParams", AuditionParamsSchema);
