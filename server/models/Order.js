const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  round: { type: Number, default: 1 } // Round/batch number for kitchen sequencing
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true },
  tableId: { type: String, default: null },
  section: { type: String, default: null }, // Kept for backward compat, not used in new flow
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  partLabel: { type: String, default: '' }, // e.g. "Part 1" or "Parcel #1"
  orderNumber: { type: Number, default: 0 }, // Daily order sequence number
  orderType: { type: String, enum: ['Dine-in', 'Parcel'], required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, default: 0 }, // Before tax
  taxAmount: { type: Number, default: 0 }, // Total tax applied
  taxBreakdown: [{ name: String, percentage: Number, amount: Number }], // Individual tax lines
  totalAmount: { type: Number, required: true, default: 0 }, // Final amount after tax
  paymentType: { type: String, enum: ['Paid', 'Guest'], default: 'Paid' },
  paymentMode: { type: String, enum: ['Cash', 'Online'], default: 'Online' },
  guestNote: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Served', 'Paid', 'Cancelled'], default: 'Pending' },
  currentRound: { type: Number, default: 1 }, // Track which round we're on
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', default: null }, // Staff who placed this order
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
