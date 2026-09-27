import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  company: {
    type: String,
    required: true,
  },
  alertName: {
    type: String,
    required: true,
  },
  alertType: {
    type: String,
    enum: ['upper', 'lower'],
    required: true,
  },
  threshold: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  triggered: {
    type: Boolean,
    default: false,
  },
  triggeredAt: Date,
  lastCheckedPrice: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

alertSchema.index({ userId: 1, isActive: 1 });

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
