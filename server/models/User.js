const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobileNumber: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Staff', 'Waiter', 'Kitchen'], default: 'Staff' },
  parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArcheUser', default: null }, // Links staff to their owner
  notificationsEnabled: { type: Boolean, default: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  tableCount: { type: Number, default: 10, min: 10, max: 50 },
  restaurantName: { type: String, default: '', trim: true },
  restaurantAddress: { type: String, default: '', trim: true },
  restaurantPhone: { type: String, default: '', trim: true },
  gstNumber: { type: String, default: '', trim: true },
  fssaiNumber: { type: String, default: '', trim: true },
  // Default ON: admin can explicitly turn it OFF.
  printMobileRequired: { type: Boolean, default: true },
  // Tax configuration
  taxEnabled: { type: Boolean, default: false },
  taxes: [{
    name: { type: String, default: 'GST' },
    percentage: { type: Number, default: 5 },
    enabled: { type: Boolean, default: true }
  }],
  menuCategories: {
    type: [String],
    default: ['Veg', 'Non-Veg', 'Beverage', 'Dessert']
  },
  tableAreas: {
    type: [String],
    default: ['Main Floor']
  },
  // Monotonic per-user order sequence (1, 2, 3...)
  lastOrderNumber: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('ArcheUser', userSchema);
