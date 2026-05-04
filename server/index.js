const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- MODELS ---
const ArcheUser = require('./models/User');
const Menu = require('./models/Menu');
const Order = require('./models/Order');
const Table = require('./models/Table');
const Subscription = require('./models/Subscription');
const Notification = require('./models/Notification');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'archearc_jwt_secret_2024';
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS) || 7;
const SUBSCRIPTION_AMOUNT = parseFloat(process.env.SUBSCRIPTION_AMOUNT) || 1;

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro', {
  serverSelectionTimeoutMS: 10000,
}).then(() => {
  console.log('✓ MongoDB Connected');
}).catch(err => {
  console.error('✗ MongoDB Failed:', err.message);
  process.exit(1);
});

// --- AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // For staff (Waiter/Kitchen), ownerId resolves to the parent admin's ID
    // For Admin, ownerId is their own ID
    req.user.ownerId = decoded.ownerId || decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  // Accept both 'Admin' (new) and 'Staff' (legacy owner accounts)
  if (req.user?.role === 'Admin' || req.user?.role === 'Staff') return next();
  res.status(403).json({ error: 'Admin access required' });
};

// Allows Waiter + Admin + Staff(legacy) to place orders
const canPlaceOrders = (req, res, next) => {
  if (['Admin', 'Waiter', 'Staff'].includes(req.user?.role)) return next();
  res.status(403).json({ error: 'Not authorized to place orders' });
};

// --- SUBSCRIPTION MIDDLEWARE ---
const requireSubscription = async (req, res, next) => {
  try {
    // Staff uses owner's subscription
    const subUserId = req.user.ownerId || req.user.id;
    const sub = await Subscription.findOne({ userId: subUserId });
    if (!sub) {
      return res.status(403).json({ error: 'No subscription found', code: 'NO_SUBSCRIPTION' });
    }
    if (!sub.isValid()) {
      // Auto-expire trial if past end date
      if (sub.plan === 'trial' && sub.status === 'active') {
        sub.status = 'expired';
        await sub.save();
      }
      return res.status(403).json({ error: 'Subscription expired', code: 'SUBSCRIPTION_EXPIRED' });
    }
    req.subscription = sub;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// AUTH ROUTES
// =====================

// POST /api/auth/fix-role — Upgrade legacy 'Staff' owners to 'Admin' (self-service)
app.post('/api/auth/fix-role', auth, async (req, res) => {
  try {
    // Only upgrade if they are a legacy owner (Staff role with no parentUserId)
    if (req.user.role === 'Staff' && !req.user.ownerId) {
      await ArcheUser.findByIdAndUpdate(req.user.id, { role: 'Admin' });
      return res.json({ message: 'Role upgraded to Admin', role: 'Admin' });
    }
    res.json({ message: 'No change needed', role: req.user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, mobileNumber, password } = req.body;
    if (!name || !mobileNumber || !password) return res.status(400).json({ error: 'Name, mobile number and password are required' });

    const exists = await ArcheUser.findOne({ mobileNumber });
    if (exists) return res.status(400).json({ error: 'An account with this mobile number already exists' });

    const user = new ArcheUser({ name, mobileNumber, password, role: 'Admin' });
    await user.save();

    // Generate default tables
    const defaultTables = [];
    for (let i = 1; i <= 10; i++) {
      defaultTables.push({ tableId: `T${i}`, seats: 4, userId: user._id });
    }
    await Table.insertMany(defaultTables);

    // Generate default menu
    const defaultMenu = [
      { name: 'Paneer Butter Masala', category: 'Veg', price: 250, userId: user._id },
      { name: 'Chicken Tikka', category: 'Non-Veg', price: 300, userId: user._id },
      { name: 'Coke', category: 'Beverage', price: 60, userId: user._id },
      { name: 'Gulab Jamun', category: 'Dessert', price: 100, userId: user._id }
    ];
    await Menu.insertMany(defaultMenu);

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, mobileNumber: user.mobileNumber, role: user.role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    if (!mobileNumber || !password) return res.status(400).json({ error: 'Mobile number and password are required' });

    const user = await ArcheUser.findOne({ mobileNumber });
    if (!user) return res.status(401).json({ error: 'Invalid mobile number or password' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid mobile number or password' });

    // For staff, include ownerId (parentUserId) so data is scoped to the admin's account
    const tokenPayload = { id: user._id, name: user.name, role: user.role };
    if (user.parentUserId) {
      tokenPayload.ownerId = user.parentUserId;
    }
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, mobileNumber: user.mobileNumber, role: user.role, parentUserId: user.parentUserId || null } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });

    const user = await ArcheUser.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ error: 'Incorrect current password' });

    user.password = newPassword;
    await user.save(); // This triggers the pre-save hook to hash the new password

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await ArcheUser.findById(req.user.id).select('-password').populate('subscription');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userData = user.toObject();
    // For staff users, also include the owner's restaurant config
    if (user.parentUserId) {
      const owner = await ArcheUser.findById(user.parentUserId).select('restaurantName restaurantAddress restaurantPhone gstNumber fssaiNumber taxEnabled taxes menuCategories tableCount tableAreas');
      if (owner) {
        userData.restaurantName = owner.restaurantName;
        userData.restaurantAddress = owner.restaurantAddress;
        userData.restaurantPhone = owner.restaurantPhone;
        userData.gstNumber = owner.gstNumber;
        userData.fssaiNumber = owner.fssaiNumber;
        userData.taxEnabled = owner.taxEnabled;
        userData.taxes = owner.taxes;
        userData.menuCategories = owner.menuCategories;
        userData.tableCount = owner.tableCount;
        userData.tableAreas = owner.tableAreas;
      }
    }
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// SUBSCRIPTION ROUTES
// =====================

// POST /api/subscription/activate — Start trial or pro plan
app.post('/api/subscription/activate', auth, async (req, res) => {
  try {
    const { plan } = req.body; // 'trial' or 'pro'
    const userId = req.user.id;

    // Check if subscription already exists
    let sub = await Subscription.findOne({ userId });
    if (sub && sub.isValid()) {
      return res.status(400).json({ error: 'Active subscription already exists' });
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    if (sub) {
      // Reactivate expired subscription
      sub.plan = plan || 'trial';
      sub.status = 'active';
      sub.trialStartDate = now;
      sub.trialEndDate = trialEnd;
      sub.autopayEnabled = (plan === 'pro' || plan === 'super');
      sub.amount = plan === 'super' ? 2 : (plan === 'pro' ? 1 : 0);
      sub.nextBillingDate = (plan === 'pro' || plan === 'super') ? trialEnd : null;
      if (plan === 'pro' || plan === 'super') {
        sub.paymentHistory.push({ date: now, amount: 0, status: 'success', method: 'trial_start' });
      }
    } else {
      sub = new Subscription({
        userId,
        plan: plan || 'trial',
        status: 'active',
        trialStartDate: now,
        trialEndDate: trialEnd,
        autopayEnabled: (plan === 'pro' || plan === 'super'),
        amount: plan === 'super' ? 2 : (plan === 'pro' ? 1 : 0),
        nextBillingDate: (plan === 'pro' || plan === 'super') ? trialEnd : null,
        paymentHistory: [{ date: now, amount: 0, status: 'success', method: 'trial_start' }]
      });
    }

    await sub.save();

    // Link subscription to user
    await ArcheUser.findByIdAndUpdate(userId, { subscription: sub._id });

    res.status(201).json(sub);
  } catch (err) {
    console.error('Subscription activate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/status
app.get('/api/subscription/status', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) {
      return res.json({ hasSubscription: false, status: 'none', plan: null });
    }

    // Auto-expire trial
    if (sub.plan === 'trial' && sub.status === 'active' && new Date() > sub.trialEndDate) {
      sub.status = 'expired';
      await sub.save();
    }

    res.json({
      hasSubscription: true,
      id: sub._id,
      plan: sub.plan,
      status: sub.status,
      trialStartDate: sub.trialStartDate,
      trialEndDate: sub.trialEndDate,
      trialDaysRemaining: sub.trialDaysRemaining(),
      isValid: sub.isValid(),
      autopayEnabled: sub.autopayEnabled,
      amount: sub.amount,
      nextBillingDate: sub.nextBillingDate,
      paymentHistory: sub.paymentHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subscription/enable-autopay
app.patch('/api/subscription/enable-autopay', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    sub.autopayEnabled = true;
    
    // Ensure amount is set (default to SUBSCRIPTION_AMOUNT if 0 or missing)
    if (!sub.amount || sub.amount === 0) {
      sub.amount = SUBSCRIPTION_AMOUNT;
    }

    const now = new Date();
    // If trial is still active, next billing is at the end of trial. Otherwise, 1 month from now.
    sub.nextBillingDate = (sub.trialEndDate && now < sub.trialEndDate) ? sub.trialEndDate : new Date(now.setMonth(now.getMonth() + 1));
    
    sub.paymentHistory.push({
      date: new Date(),
      amount: 0,
      status: 'success',
      method: 'autopay_enabled'
    });
    
    await sub.save();
    res.json({ message: 'Autopay enabled successfully', subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/cancel — Cancel subscription (stops autopay and marks for expiry)
app.post('/api/subscription/cancel', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    sub.status = 'cancelled';
    sub.autopayEnabled = false;
    sub.nextBillingDate = null;
    
    sub.paymentHistory.push({
      date: new Date(),
      amount: 0,
      status: 'success',
      method: 'manual_cancellation'
    });

    await sub.save();
    res.json({ message: 'Subscription cancelled successfully', subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subscription/cancel-autopay
app.patch('/api/subscription/cancel-autopay', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    sub.autopayEnabled = false;
    sub.nextBillingDate = null;
    
    sub.paymentHistory.push({
      date: new Date(),
      amount: 0,
      status: 'success',
      method: 'autopay_cancelled'
    });

    await sub.save();
    res.json({ message: 'Autopay cancelled successfully', subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// SETTINGS ROUTES
// =====================

// GET /api/settings
app.get('/api/settings', auth, async (req, res) => {
  try {
    const user = await ArcheUser.findById(req.user.id).select('tableCount restaurantName restaurantAddress restaurantPhone gstNumber fssaiNumber printMobileRequired taxEnabled taxes menuCategories name email role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
app.patch('/api/settings', auth, async (req, res) => {
  try {
    const { tableCount, restaurantName, restaurantAddress, restaurantPhone, gstNumber, fssaiNumber, printMobileRequired, taxEnabled, taxes, menuCategories } = req.body;
    const update = {};
    if (tableCount !== undefined) {
      update.tableCount = Math.max(10, Math.min(50, parseInt(tableCount)));
    }
    if (restaurantName !== undefined) update.restaurantName = restaurantName;
    if (restaurantAddress !== undefined) update.restaurantAddress = restaurantAddress;
    if (restaurantPhone !== undefined) update.restaurantPhone = restaurantPhone;
    if (gstNumber !== undefined) update.gstNumber = gstNumber;
    if (fssaiNumber !== undefined) update.fssaiNumber = fssaiNumber;
    if (printMobileRequired !== undefined) update.printMobileRequired = !!printMobileRequired;
    if (taxEnabled !== undefined) update.taxEnabled = taxEnabled;
    if (taxes !== undefined) update.taxes = taxes;
    if (menuCategories !== undefined && Array.isArray(menuCategories)) {
      const cleaned = menuCategories
        .map(c => String(c || '').trim())
        .filter(Boolean);
      update.menuCategories = cleaned.length ? cleaned : ['Veg', 'Non-Veg', 'Beverage', 'Dessert'];
    }

    const user = await ArcheUser.findByIdAndUpdate(req.user.id, update, { new: true })
      .select('tableCount restaurantName restaurantAddress restaurantPhone gstNumber fssaiNumber printMobileRequired taxEnabled taxes menuCategories name email role');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// MENU ROUTES
// =====================

app.get('/api/menu', auth, async (req, res) => {
  try {
    const items = await Menu.find({ userId: req.user.ownerId }).sort('category name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', auth, adminOnly, async (req, res) => {
  try {
    const item = new Menu({ ...req.body, userId: req.user.id });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/menu/:id', auth, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', auth, adminOnly, async (req, res) => {
  try {
    await Menu.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/toggle — Quick availability toggle
app.patch('/api/menu/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findOne({ _id: req.params.id, userId: req.user.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// ORDER ROUTES
// =====================

app.get('/api/orders/active', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.ownerId, status: { $nin: ['Paid', 'Cancelled'] } }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats — Accurate order counts
app.get('/api/orders/stats', auth, async (req, res) => {
  try {
    const userId = req.user.ownerId;
    const [running, completed, cancelled] = await Promise.all([
      Order.countDocuments({ userId, status: { $nin: ['Paid', 'Cancelled'] } }),
      Order.countDocuments({ userId, status: 'Paid' }),
      Order.countDocuments({ userId, status: 'Cancelled' }),
    ]);
    res.json({ total: running + completed + cancelled, running, completed, cancelled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — Paginated history with search and filter
app.get('/api/orders', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const type = req.query.type || 'All';
    const paymentType = req.query.paymentType || 'All';
    
    const query = { userId: req.user.ownerId };
    if (type !== 'All' && type !== '') query.orderType = type;
    
    if (paymentType === 'Guest') {
      query.paymentType = 'Guest';
    } else if (paymentType === 'Paid') {
      query.paymentType = { $ne: 'Guest' };
    }
    // If 'All', we don't add paymentType filter (shows everything)
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { tableId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      orders,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Specific order detail
app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.ownerId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', auth, canPlaceOrders, async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const user = await ArcheUser.findById(ownerId);
    const orderData = { ...req.body };
    
    // Server-side calculation if items are provided but totals are missing or need validation
    if (orderData.items && orderData.items.length > 0) {
      const subtotal = orderData.items.reduce((s, i) => s + (i.price * i.quantity), 0);
      orderData.subtotal = subtotal;

      if (user && user.taxEnabled) {
        const taxes = (user.taxes || []).filter(t => t.enabled);
        const taxBreakdown = taxes.map(t => ({
          name: t.name,
          percentage: t.percentage,
          amount: Math.round((subtotal * t.percentage / 100) * 100) / 100
        }));
        const taxAmount = taxBreakdown.reduce((s, t) => s + t.amount, 0);
        orderData.taxBreakdown = taxBreakdown;
        orderData.taxAmount = taxAmount;
        orderData.totalAmount = subtotal + taxAmount;
      } else {
        orderData.taxAmount = 0;
        orderData.taxBreakdown = [];
        orderData.totalAmount = subtotal;
      }
    }

    // AUTO-NUMBERING (Per-account monotonic sequence, no daily reset)
    if (!user?.lastOrderNumber || user.lastOrderNumber < 1) {
      const maxExistingOrder = await Order.findOne({ userId: ownerId })
        .sort({ orderNumber: -1 })
        .select('orderNumber');
      const seedNumber = maxExistingOrder?.orderNumber || 0;
      await ArcheUser.updateOne(
        { _id: ownerId, $or: [{ lastOrderNumber: { $exists: false } }, { lastOrderNumber: { $lt: 1 } }] },
        { $set: { lastOrderNumber: seedNumber } }
      );
    }

    const seqUser = await ArcheUser.findByIdAndUpdate(
      ownerId,
      { $inc: { lastOrderNumber: 1 } },
      { new: true, projection: { lastOrderNumber: 1 } }
    );
    orderData.orderNumber = seqUser?.lastOrderNumber || 1;
    orderData.userId = ownerId;
    orderData.createdBy = req.user.id; // Track who placed the order

    // Default formatting for quick parcels
    if (orderData.orderType === 'Parcel' && !orderData.customerName) {
      orderData.customerName = `Parcel #${orderData.orderNumber}`;
      orderData.partLabel = `#${orderData.orderNumber}`;
    }

    const order = new Order(orderData);
    await order.save();

    // Sync table state for Dine-in orders
    if (order.orderType === 'Dine-in' && order.tableId) {
      await Table.findOneAndUpdate(
        { tableId: order.tableId, userId: ownerId },
        { status: 'Occupied', currentOrderId: order._id, lastUpdated: new Date() },
        { upsert: true }
      );
    }

    // Create notification for owner + kitchen if placed by waiter
    if (req.user.role === 'Waiter') {
      const itemsSummary = orderData.items?.slice(0, 3).map(i => i.name).join(', ') || 'items';
      const notifMsg = `New order${order.tableId ? ' at ' + order.tableId : ''} by ${req.user.name}: ${itemsSummary}`;
      await Notification.create({
        userId: ownerId,
        type: 'new_order',
        orderId: order._id,
        message: notifMsg
      });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/add-items — Add items to existing order (new round)
app.patch('/api/orders/:id/add-items', auth, canPlaceOrders, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const user = await ArcheUser.findById(req.user.ownerId);
    const newRound = (order.currentRound || 1) + 1;
    const newItemsWithRound = items.map(i => ({ ...i, round: newRound }));
    
    order.items.push(...newItemsWithRound);
    order.currentRound = newRound;
    
    // Recalculate subtotal
    const subtotal = order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    order.subtotal = subtotal;

    // Recalculate taxes
    if (user && user.taxEnabled) {
      const taxes = (user.taxes || []).filter(t => t.enabled);
      const taxBreakdown = taxes.map(t => ({
        name: t.name,
        percentage: t.percentage,
        amount: Math.round((subtotal * t.percentage / 100) * 100) / 100
      }));
      order.taxBreakdown = taxBreakdown;
      order.taxAmount = taxBreakdown.reduce((s, t) => s + t.amount, 0);
    } else {
      order.taxAmount = 0;
      order.taxBreakdown = [];
    }
    
    order.totalAmount = order.subtotal + order.taxAmount;
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error('Add items error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', auth, async (req, res) => {
  try {
    const { status, customerPhone, paymentMode, paymentType, guestNote } = req.body;
    const updateData = { status };
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (paymentType) updateData.paymentType = paymentType;
    if (guestNote !== undefined) updateData.guestNote = guestNote;
    
    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Sync table state (simplified)
    if (order.orderType === 'Dine-in' && order.tableId) {
      let tableStatus = 'Occupied';
      if (status === 'Paid') tableStatus = 'Available';
      else if (status === 'Served') tableStatus = 'Served';

      await Table.findOneAndUpdate(
        { tableId: order.tableId },
        { status: tableStatus, currentOrderId: status === 'Paid' ? null : order._id, lastUpdated: new Date() },
        { upsert: true }
      );
    }

    // Trigger notification when order is Served
    if (status === 'Served') {
      // Always notify the owner
      await Notification.create({
        userId: order.userId, // owner always gets notified
        type: 'order_update',
        orderId: order._id,
        message: `Order #${order.orderNumber} is ready to serve! ${order.tableId ? '(Table ' + order.tableId + ')' : ''}`
      });

      // If a waiter placed the order, also notify the waiter specifically
      if (order.createdBy && order.createdBy.toString() !== order.userId.toString()) {
        await Notification.create({
          userId: order.createdBy,
          type: 'order_update',
          orderId: order._id,
          message: `Order #${order.orderNumber} is ready to serve! ${order.tableId ? '(Table ' + order.tableId + ')' : ''}`
        });
      }
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/transfer', auth, async (req, res) => {
  try {
    const { newTableId } = req.body;
    if (!newTableId) {
      return res.status(400).json({ error: 'newTableId is required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const oldTableId = order.tableId;
    
    // Update order with new table
    order.tableId = newTableId;
    await order.save();

    // Check if old table still has active orders
    if (oldTableId && oldTableId !== newTableId) {
      const activeOrdersOnOldTable = await Order.countDocuments({
        tableId: oldTableId,
        status: { $nin: ['Paid', 'Cancelled'] }
      });

      if (activeOrdersOnOldTable === 0) {
        await Table.findOneAndUpdate(
          { tableId: oldTableId },
          { status: 'Available', currentOrderId: null, lastUpdated: new Date() }
        );
      }
    }

    // Update new table status
    await Table.findOneAndUpdate(
      { tableId: newTableId },
      { status: 'Occupied', currentOrderId: order._id, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// TABLE ROUTES
// =====================

app.get('/api/table-areas', auth, async (req, res) => {
  try {
    const user = await ArcheUser.findById(req.user.ownerId).select('tableAreas');
    const areas = Array.isArray(user?.tableAreas) && user.tableAreas.length
      ? user.tableAreas
      : ['Main Floor'];
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/table-areas', auth, adminOnly, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Area name is required' });

    const user = await ArcheUser.findById(req.user.ownerId).select('tableAreas');
    const current = Array.isArray(user?.tableAreas) ? user.tableAreas : ['Main Floor'];
    const exists = current.some(a => a.toLowerCase() === name.toLowerCase());
    const next = exists ? current : [...current, name];

    await ArcheUser.findByIdAndUpdate(req.user.ownerId, { tableAreas: next });
    res.status(201).json(next);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/table-areas/:name', auth, adminOnly, async (req, res) => {
  try {
    const name = String(req.params.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Area name is required' });
    if (name.toLowerCase() === 'main floor') return res.status(400).json({ error: 'Cannot delete Main Floor' });

    const user = await ArcheUser.findById(req.user.ownerId).select('tableAreas');
    const current = Array.isArray(user?.tableAreas) ? user.tableAreas : ['Main Floor'];
    const next = current.filter(a => a.toLowerCase() !== name.toLowerCase());

    await ArcheUser.findByIdAndUpdate(req.user.ownerId, { tableAreas: next });
    
    // Optionally delete tables in this area
    await Table.deleteMany({ userId: req.user.ownerId, area: new RegExp('^' + name + '$', 'i') });
    
    res.json({ message: 'Area deleted successfully', tableAreas: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tables', auth, async (req, res) => {
  try {
    const tables = await Table.find({ userId: req.user.ownerId }).sort('tableId');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tables — Add a new table
app.post('/api/tables', auth, adminOnly, async (req, res) => {
  try {
    const { tableId, seats, area } = req.body;
    const normalizedArea = (area || 'Main Floor').trim();
    const table = new Table({
      tableId,
      seats: seats || 4,
      area: normalizedArea,
      userId: req.user.ownerId
    });
    await table.save();
    await ArcheUser.findByIdAndUpdate(
      req.user.ownerId,
      { $addToSet: { tableAreas: normalizedArea } }
    );
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tables/:tableId — Update table seats or other metadata
app.patch('/api/tables/:tableId', auth, adminOnly, async (req, res) => {
  try {
    const { seats, status, area } = req.body;
    const update = {};
    if (seats !== undefined) update.seats = seats;
    if (status !== undefined) update.status = status;
    if (area !== undefined) update.area = (area || 'Main Floor').trim();
    update.lastUpdated = new Date();

    const table = await Table.findOneAndUpdate({ tableId: req.params.tableId, userId: req.user.ownerId }, update, { new: true });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tables/:tableId — Remove a table
app.delete('/api/tables/:tableId', auth, adminOnly, async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({ tableId: req.params.tableId, userId: req.user.ownerId });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json({ message: 'Table removed', tableId: req.params.tableId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tables/:tableId/section', auth, adminOnly, async (req, res) => {
  try {
    const { section, status } = req.body;
    const update = { [`sections.${section}.status`]: status, lastUpdated: new Date() };
    const table = await Table.findOneAndUpdate({ tableId: req.params.tableId, userId: req.user.ownerId }, update, { new: true, upsert: true });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// ANALYTICS / SALES ROUTES
// =====================

// Helper: get date range from period string
function getDateRange(period) {
  const now = new Date();
  let start;
  let end = now;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'previous_week': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(todayStart);
      end.setDate(end.getDate() - 7);
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case '3months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year': {
      // Indian financial year: April 1 – March 31
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fyYear, 3, 1); // April 1
      break;
    }
    case 'all':
    default:
      start = new Date(2020, 0, 1);
      break;
  }
  return { start, end };
}

// GET /api/analytics/sales?period=today|week|previous_week|month|3months|year|all|custom
app.get('/api/analytics/sales', auth, async (req, res) => {
  try {
    const period = req.query.period || 'today';
    let start, end;

    if (period === 'custom' && req.query.from && req.query.to) {
      start = new Date(req.query.from);
      start.setHours(0, 0, 0, 0);
      end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
    } else {
      ({ start, end } = getDateRange(period));
    }

    const orders = await Order.find({
      userId: req.user.ownerId,
      status: 'Paid',
      createdAt: { $gte: start, $lte: end }
    }).sort('-createdAt');

    const paidOrders = orders.filter(o => o.paymentType !== 'Guest');
    const guestOrders = orders.filter(o => o.paymentType === 'Guest');

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const guestOrdersValue = guestOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const guestOrdersCount = guestOrders.length;
    
    const dineInOrders = paidOrders.filter(o => o.orderType === 'Dine-in');
    const parcelOrders = paidOrders.filter(o => o.orderType === 'Parcel');
    const dineInRevenue = dineInOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const parcelRevenue = parcelOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Top items & All Inventory (including items with 0 sales)
    const menuItems = await Menu.find({ userId: req.user.ownerId });
    const itemMap = {};
    
    // Initialize with all menu items
    menuItems.forEach(mi => {
      itemMap[mi.name] = { name: mi.name, quantity: 0, revenue: 0 };
    });

    // Add sales data
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!itemMap[item.name]) {
          // In case item name was changed in menu but exists in old orders
          itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });

    const sortedItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
    const topItems = sortedItems.filter(i => i.revenue > 0).slice(0, 5);
    const allItemsSold = sortedItems;

    // Daily breakdown
    const dailyMap = {};
    
    // Pre-populate missing days for certain periods so charts look complete
    if (period === 'week' || period === 'previous_week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        dailyMap[dayStr] = { date: dayStr, orders: 0, dineIn: 0, parcel: 0, total: 0, avgOrder: 0 };
      }
    }
    
    // We count total orders for dailyMap, but revenue only from paidOrders
    orders.forEach(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, dineIn: 0, parcel: 0, total: 0, avgOrder: 0 };
      dailyMap[day].orders++;
      
      if (o.paymentType !== 'Guest') {
        dailyMap[day].total += o.totalAmount;
        if (o.orderType === 'Dine-in') dailyMap[day].dineIn += o.totalAmount;
        else dailyMap[day].parcel += o.totalAmount;
      }
    });
    // compute avgOrder per day
    Object.values(dailyMap).forEach(d => { d.avgOrder = d.orders > 0 ? Math.round(d.total / d.orders) : 0; });
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Hourly breakdown — only populated for today
    let hourlyBreakdown = [];
    if (period === 'today') {
      const hourlyMap = {};
      for (let h = 0; h < 24; h++) hourlyMap[h] = { hour: h, orders: 0, dineIn: 0, parcel: 0, total: 0 };
      orders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hourlyMap[h].orders++;
        
        if (o.paymentType !== 'Guest') {
          hourlyMap[h].total += o.totalAmount;
          if (o.orderType === 'Dine-in') hourlyMap[h].dineIn += o.totalAmount;
          else hourlyMap[h].parcel += o.totalAmount;
        }
      });
      // Only include hours from first order to current hour + 1
      const currentHour = new Date().getHours();
      const orderHours = orders.map(o => new Date(o.createdAt).getHours());
      const firstHour = orderHours.length > 0 ? Math.min(...orderHours) : currentHour;
      hourlyBreakdown = Object.values(hourlyMap)
        .filter(h => h.hour >= firstHour && h.hour <= currentHour)
        .sort((a, b) => a.hour - b.hour);
    }

    res.json({
      period,
      dateRange: { start, end },
      totalRevenue,
      totalOrders: orders.length, // Include guest in total order count
      guestOrdersValue,
      guestOrdersCount,
      dineInOrders: dineInOrders.length, // only paid
      parcelOrders: parcelOrders.length, // only paid
      dineInRevenue,
      parcelRevenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      topItems,
      allItemsSold,
      dailyBreakdown,
      hourlyBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET /api/analytics/summary — Quick overview stats
app.get('/api/analytics/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, allPaidOrders, activeOrders] = await Promise.all([
      Order.find({ userId: req.user.ownerId, status: 'Paid', createdAt: { $gte: today } }),
      Order.countDocuments({ userId: req.user.ownerId, status: 'Paid' }),
      Order.countDocuments({ userId: req.user.ownerId, status: { $ne: 'Paid' } })
    ]);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      todayRevenue,
      todayOrders: todayOrders.length,
      totalPaidOrders: allPaidOrders,
      activeOrders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export?period=...&format=csv
app.get('/api/analytics/export', auth, async (req, res) => {
  try {
    const period = req.query.period || 'year';
    let start, end;

    if (period === 'custom' && req.query.from && req.query.to) {
      start = new Date(req.query.from);
      start.setHours(0, 0, 0, 0);
      end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
    } else {
      ({ start, end } = getDateRange(period));
    }

    const orders = await Order.find({
      userId: req.user.ownerId,
      status: 'Paid',
      createdAt: { $gte: start, $lte: end }
    }).sort('createdAt');

    // Build CSV
    let csv = 'Date,Order ID,Type,Table,Customer,Phone,Items,Total Amount\n';
    orders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-IN');
      const items = o.items.map(i => `${i.name}x${i.quantity}`).join('; ');
      const customer = o.customerName || 'Walk-in';
      const phone = o.customerPhone || '-';
      const table = o.tableId || '-';
      csv += `${date},${o._id},${o.orderType},${table},"${customer}",${phone},"${items}",${o.totalAmount}\n`;
    });

    // Summary row
    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    csv += `\n,,,,,TOTAL,,${total}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =====================
// STAFF MANAGEMENT ROUTES
// =====================

// GET /api/staff — List all staff for current admin
app.get('/api/staff', auth, adminOnly, async (req, res) => {
  try {
    const staff = await ArcheUser.find({ parentUserId: req.user.id })
      .select('name mobileNumber role notificationsEnabled createdAt')
      .sort('-createdAt');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff — Create a new staff member (Waiter or Kitchen)
app.post('/api/staff', auth, adminOnly, async (req, res) => {
  try {
    const { name, mobileNumber, password, role } = req.body;
    if (!name || !mobileNumber || !password) {
      return res.status(400).json({ error: 'Name, mobile number and password are required' });
    }
    if (!['Waiter', 'Kitchen'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Waiter or Kitchen' });
    }

    const exists = await ArcheUser.findOne({ mobileNumber });
    if (exists) return res.status(400).json({ error: 'An account with this mobile number already exists' });

    const staffUser = new ArcheUser({
      name,
      mobileNumber,
      password,
      role,
      parentUserId: req.user.id
    });
    await staffUser.save();
    res.status(201).json({
      _id: staffUser._id,
      name: staffUser.name,
      mobileNumber: staffUser.mobileNumber,
      role: staffUser.role,
      createdAt: staffUser.createdAt
    });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id — Update staff details
app.patch('/api/staff/:id', auth, adminOnly, async (req, res) => {
  try {
    const staff = await ArcheUser.findOne({ _id: req.params.id, parentUserId: req.user.id });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    const { name, mobileNumber, password } = req.body;
    if (name) staff.name = name;
    if (mobileNumber) {
      // Check uniqueness
      const exists = await ArcheUser.findOne({ mobileNumber, _id: { $ne: staff._id } });
      if (exists) return res.status(400).json({ error: 'Mobile number already in use' });
      staff.mobileNumber = mobileNumber;
    }
    if (password) staff.password = password; // pre-save hook will hash it

    await staff.save();
    res.json({ _id: staff._id, name: staff.name, mobileNumber: staff.mobileNumber, role: staff.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id — Remove a staff member
app.delete('/api/staff/:id', auth, adminOnly, async (req, res) => {
  try {
    const staff = await ArcheUser.findOneAndDelete({ _id: req.params.id, parentUserId: req.user.id });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ message: 'Staff member removed', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// NOTIFICATION ROUTES
// =====================

// GET /api/notifications — Fetch unread notifications for the specific user
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort('-createdAt')
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read — Mark all as read
app.patch('/api/notifications/read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read — Mark single as read
app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// HEALTH CHECK
// =====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`\n--- ARCHEARC RESTRO BACKEND PORT:${PORT} ---\n`);
  console.log('Routes registered:');
  console.log('  [AUTH]         POST  /api/auth/register, /api/auth/login');
  console.log('  [USER]         GET   /api/auth/me');
  console.log('  [SUBSCRIPTION] POST  /api/subscription/activate, /api/subscription/cancel');
  console.log('  [SUBSCRIPTION] GET   /api/subscription/status');
  console.log('  [SUBSCRIPTION] PATCH /api/subscription/enable-autopay, /api/subscription/cancel-autopay');
  console.log('  [SETTINGS]     GET   /api/settings, PATCH /api/settings');
  console.log('  [MENU]         GET   /api/menu, POST /api/menu');
  console.log('  [ORDERS]       POST  /api/orders, GET /api/orders, GET /api/orders/active');
  console.log('  [TABLES]       GET   /api/tables, PATCH /api/tables/:id/section');
  console.log('  [STAFF]        GET   /api/staff, POST /api/staff, PATCH/DELETE /api/staff/:id');
  console.log('  [NOTIF]        GET   /api/notifications, PATCH /api/notifications/read');
  console.log('  [ANALYTICS]    GET   /api/analytics/sales, /api/analytics/summary');
  console.log('  [HEALTH]       GET   /api/health\n');
});
