const mongoose = require('mongoose');

const loyaltyCodeSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  isUsed: { type: Boolean, default: false, index: true },
  usedBy: { type: String, default: '' }, // customerId who consumed the code
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, expires: '1d', default: Date.now } // Auto-delete after 1 day
}, { timestamps: true });

loyaltyCodeSchema.index({ restaurantId: 1, isUsed: 1 });

module.exports = mongoose.model('LoyaltyCode', loyaltyCodeSchema);

