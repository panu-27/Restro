const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['Veg', 'Non-Veg', 'Beverage', 'Dessert'], required: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Menu', menuSchema);
