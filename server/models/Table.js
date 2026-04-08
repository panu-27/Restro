const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableId: { type: String, required: true, unique: true }, // Table 1, Table 2, etc.
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
