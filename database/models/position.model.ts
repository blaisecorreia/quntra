import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  // Per-share weighted average cost basis — adding more shares at a
  // different price updates this; selling shares does not (standard
  // average-cost-basis accounting).
  averageCost: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

positionSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Position = mongoose.models.Position || mongoose.model('Position', positionSchema);
