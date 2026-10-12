const mongoose = require('mongoose');

const loyaltySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true, index: true },
  customerId: { type: String, trim: true, index: true },
  customerPhone: { type: String, trim: true, index: true },
  customerName: { type: String, trim: true, default: '' },
  ipAddress: { type: String, default: '' },
  visitCount: { type: Number, default: 0 },
  lastVisitDate: { type: Date },
  history: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['check_in', 'reset', 'admin_reset'], default: 'check_in' },
    note: { type: String, default: '' }
  }]
}, { timestamps: true });

loyaltySchema.index({ restaurantId: 1, customerId: 1 });
loyaltySchema.index({ restaurantId: 1, customerPhone: 1 });
loyaltySchema.index({ restaurantId: 1, ipAddress: 1 });

module.exports = mongoose.model('Loyalty', loyaltySchema);

