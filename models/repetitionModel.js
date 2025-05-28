import mongoose from "mongoose";

const repetitionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g. '18:30'
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

    notifiedDayBefore: {
  type: Boolean,
  default: false,
},
notifiedTwoHoursBefore: {
  type: Boolean,
  default: false,
},

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
