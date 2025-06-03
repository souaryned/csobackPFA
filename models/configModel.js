// models/configModel.js
import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  signupActive: {
    type: Boolean,
    default: false,
  },

   participationThreshold: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  }
});

export default mongoose.model("Config", configSchema);