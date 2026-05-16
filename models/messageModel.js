// models/messageModel.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['chef_pupitre', 'choriste', 'admin', 'manager'],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    pupitre: {
      type: String,
      enum: ['soprano', 'alto', 'ténor', 'basse'],
      required: true,
    },
    repetitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repetition',
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
messageSchema.index({ recipientId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ pupitre: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
