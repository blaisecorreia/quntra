import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: {
    type: [chatMessageSchema],
    default: [],
  },
}, { timestamps: true });

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
