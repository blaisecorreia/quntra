import mongoose from 'mongoose';

const chatActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['add_to_watchlist', 'create_alert'],
    required: true,
  },
  params: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending',
  },
  error: String,
}, { _id: false });

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
  action: {
    type: chatActionSchema,
    default: undefined,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

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
