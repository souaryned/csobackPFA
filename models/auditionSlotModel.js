import mongoose from "mongoose";

const AuditionSlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true  // "HH:MM"
  },
  endTime: {
    type: String,
    required: true  // "HH:MM"
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
   paramId: {  // ← ADD THIS
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuditionParams",
    required: true
  },
  status: {
    type: String,
    enum: ["Scheduled", "Confirmed", "Absent", "Rejected"],
    default: "Scheduled"
  }
}, {
  timestamps: true
});

export default mongoose.model("AuditionSlot", AuditionSlotSchema);
