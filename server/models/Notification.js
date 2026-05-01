const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true }, // owner who should see this
  type: { type: String, enum: ['new_order', 'order_update', 'staff_action'], default: 'new_order' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Auto-expire old notifications after 24 hours
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Notification', notificationSchema);
