import mongoose from 'mongoose';

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const OptionSchema = new Schema(
  {
    valeur: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    texte: { type: String, required: true },
    type: {
      type: String,
      enum: ['texte', 'radio', 'checkbox', 'date', 'select'],
      required: true,
    },
    options: { type: [OptionSchema], default: [] },
    obligatoire: { type: Boolean, default: false },
  },
  { _id: false }
);

const SurveySchema = new Schema(
  {
    titre: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['disponibilite', 'voyage', 'restaurant', 'autre'],
      required: true,
    },
    statut: {
      type: String,
      enum: ['brouillon', 'actif', 'clos'],
      default: 'brouillon',
    },
    dateDebut: { type: Date },
    dateFin: { type: Date },

    questions: { type: [QuestionSchema], default: [] },

    ciblePupitres: {
      type: [String],
      default: [],
    },

    /** Choristes ciblés individuellement (prioritaire sur ciblePupitres). */
    cibleChoristes: {
      type: [{ type: ObjectId, ref: 'User' }],
      default: [],
    },

    createdBy: {
      type: ObjectId,
      ref: 'User',
      required: true,
    },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SurveySchema.index({ statut: 1 });
SurveySchema.index({ createdBy: 1 });
SurveySchema.index({ type: 1 });

export default mongoose.model('Survey', SurveySchema);
