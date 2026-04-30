const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true },
  tableId: { type: String, required: true }, // Not unique: true globally anymore!
  area: { type: String, default: 'Main Floor' },
  seats: { type: Number, default: 4 },
  status: { type: String, enum: ['Available', 'Occupied', 'Served'], default: 'Available' },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  sections: {
    A: { status: { type: String, enum: ['Available', 'Occupied', 'Served'], default: 'Available' }, orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null } },
    B: { status: { type: String, enum: ['Available', 'Occupied', 'Served'], default: 'Available' }, orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null } },
    C: { status: { type: String, enum: ['Available', 'Occupied', 'Served'], default: 'Available' }, orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null } },
    D: { status: { type: String, enum: ['Available', 'Occupied', 'Served'], default: 'Available' }, orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null } }
  },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', tableSchema);
