import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
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
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', watchlistSchema);
