import mongoose from 'mongoose';

const { Schema } = mongoose;

const ReponseSchema = new Schema(
  {
    questionId: { type: String, required: true },
    valeur: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const SurveyResponseSchema = new Schema(
  {
    survey: {
      type: Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
    },
    choriste: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reponses: { type: [ReponseSchema], default: [] },
    soumisLe: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Empêcher de répondre deux fois au même sondage
SurveyResponseSchema.index({ survey: 1, choriste: 1 }, { unique: true });

export default mongoose.model('SurveyResponse', SurveyResponseSchema);