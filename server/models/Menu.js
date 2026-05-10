const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true }, // e.g. "Full", "Half"
  price: { type: Number, required: true }
}, { _id: false });

const menuSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', required: true },
  name:        { type: String, required: true },
  category:    { type: String, required: true, trim: true },
  price:       { type: Number, default: 0 },           // used when variations is empty
  variations:  { type: [variationSchema], default: [] }, // up to 5 variations
  image:       { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Menu', menuSchema);

