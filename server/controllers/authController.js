const User = require('../models/User'); // This requires ArcheUser model
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, mobileNumber, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this mobile number' });
    }

    const user = new User({
      name,
      mobileNumber,
      password,
      role: role || 'Staff'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'archearc_secret_key',
      { expiresIn: '1d' }
    );

    res.status(201).json({ 
      token, 
      user: { id: user._id, name: user.name, mobileNumber: user.mobileNumber, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    const user = await User.findOne({ mobileNumber });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'archearc_secret_key',
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, mobileNumber: user.mobileNumber, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
