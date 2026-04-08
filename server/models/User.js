const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobileNumber: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Staff'], default: 'Staff' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  tableCount: { type: Number, default: 10, min: 10, max: 50 },
  restaurantName: { type: String, default: '', trim: true },
  restaurantAddress: { type: String, default: '', trim: true },
  restaurantPhone: { type: String, default: '', trim: true },
  gstNumber: { type: String, default: '', trim: true },
  fssaiNumber: { type: String, default: '', trim: true },
  // Tax configuration
  taxEnabled: { type: Boolean, default: false },
  taxes: [{
    name: { type: String, default: 'GST' },
    percentage: { type: Number, default: 5 },
    enabled: { type: Boolean, default: true }
  }],
}, { timestamps: true });

userSchema.pre('save', function(next) {
  if (!this.isModified('password')) return next();
  const user = this;
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('ArcheUser', userSchema);
