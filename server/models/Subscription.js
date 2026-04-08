const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  method: { type: String, default: 'autopay' }
});

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true, unique: true },
  plan: { type: String, enum: ['trial', 'pro', 'super'], default: 'trial' },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  trialStartDate: { type: Date, default: Date.now },
  trialEndDate: { type: Date },
  autopayEnabled: { type: Boolean, default: false },
  amount: { type: Number, default: 1 },
  nextBillingDate: { type: Date },
  paymentHistory: [paymentSchema]
}, { timestamps: true });

// Helper: check if subscription is currently valid
subscriptionSchema.methods.isValid = function() {
  if (this.status === 'cancelled') return false;
  if (this.plan === 'trial') {
    return this.status === 'active' && new Date() <= this.trialEndDate;
  }
  // Pro or Super plan with active status
  return this.status === 'active';
};

// Helper: days remaining in trial
subscriptionSchema.methods.trialDaysRemaining = function() {
  if (this.plan !== 'trial') return 0;
  const now = new Date();
  const end = new Date(this.trialEndDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
