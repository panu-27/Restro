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
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// --- SUBSCRIPTION MIDDLEWARE ---
const requireSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
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

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, mobileNumber, password } = req.body;
    if (!name || !mobileNumber || !password) return res.status(400).json({ error: 'Name, mobile number and password are required' });

    const exists = await ArcheUser.findOne({ mobileNumber });
    if (exists) return res.status(400).json({ error: 'An account with this mobile number already exists' });

    const user = new ArcheUser({ name, mobileNumber, password, role: 'Staff' });
    await user.save();

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

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, mobileNumber: user.mobileNumber, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await ArcheUser.findById(req.user.id).select('-password').populate('subscription');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
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
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

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
    const user = await ArcheUser.findById(req.user.id).select('tableCount restaurantName restaurantAddress restaurantPhone gstNumber fssaiNumber taxEnabled taxes name email role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
app.patch('/api/settings', auth, async (req, res) => {
  try {
    const { tableCount, restaurantName, restaurantAddress, restaurantPhone, gstNumber, fssaiNumber, taxEnabled, taxes } = req.body;
    const update = {};
    if (tableCount !== undefined) {
      update.tableCount = Math.max(10, Math.min(50, parseInt(tableCount)));
    }
    if (restaurantName !== undefined) update.restaurantName = restaurantName;
    if (restaurantAddress !== undefined) update.restaurantAddress = restaurantAddress;
    if (restaurantPhone !== undefined) update.restaurantPhone = restaurantPhone;
    if (gstNumber !== undefined) update.gstNumber = gstNumber;
    if (fssaiNumber !== undefined) update.fssaiNumber = fssaiNumber;
    if (taxEnabled !== undefined) update.taxEnabled = taxEnabled;
    if (taxes !== undefined) update.taxes = taxes;

    const user = await ArcheUser.findByIdAndUpdate(req.user.id, update, { new: true })
      .select('tableCount restaurantName restaurantAddress restaurantPhone gstNumber fssaiNumber taxEnabled taxes name email role');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// MENU ROUTES
// =====================

app.get('/api/menu', async (req, res) => {
  try {
    const items = await Menu.find().sort('category name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', auth, adminOnly, async (req, res) => {
  try {
    const item = new Menu(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/menu/:id', auth, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', auth, adminOnly, async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/toggle — Quick availability toggle
app.patch('/api/menu/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);
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
    const orders = await Order.find({ status: { $ne: 'Paid' } }).sort('-createdAt');
    res.json(orders);
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
    
    const query = {};
    if (type !== 'All') query.orderType = type;
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
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', auth, async (req, res) => {
  try {
    const user = await ArcheUser.findById(req.user.id);
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

    // AUTO-NUMBERING (Daily Reset)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const countToday = await Order.countDocuments({
      createdAt: { $gte: todayStart }
    });
    orderData.orderNumber = countToday + 1;

    // Default formatting for quick parcels
    if (orderData.orderType === 'Parcel' && !orderData.customerName) {
      orderData.customerName = `Parcel #${orderData.orderNumber}`;
      orderData.partLabel = `#${orderData.orderNumber}`; // Compact identifier
    }

    const order = new Order(orderData);
    await order.save();

    // Sync table state for Dine-in orders
    if (order.orderType === 'Dine-in' && order.tableId) {
      await Table.findOneAndUpdate(
        { tableId: order.tableId },
        { status: 'Occupied', currentOrderId: order._id, lastUpdated: new Date() },
        { upsert: true }
      );
    }
    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/add-items — Add items to existing order (new round)
app.patch('/api/orders/:id/add-items', auth, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const user = await ArcheUser.findById(req.user.id);
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
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
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
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// TABLE ROUTES
// =====================

app.get('/api/tables', auth, async (req, res) => {
  try {
    const tables = await Table.find().sort('tableId');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tables/:tableId/section', auth, async (req, res) => {
  try {
    const { section, status } = req.body;
    const update = { [`sections.${section}.status`]: status, lastUpdated: new Date() };
    const table = await Table.findOneAndUpdate({ tableId: req.params.tableId }, update, { new: true, upsert: true });
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
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
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
  return { start, end: now };
}

// GET /api/analytics/sales?period=today|week|month|3months|year|all
app.get('/api/analytics/sales', auth, async (req, res) => {
  try {
    const period = req.query.period || 'today';
    const { start, end } = getDateRange(period);

    const orders = await Order.find({
      status: 'Paid',
      createdAt: { $gte: start, $lte: end }
    }).sort('-createdAt');

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const dineInOrders = orders.filter(o => o.orderType === 'Dine-in');
    const parcelOrders = orders.filter(o => o.orderType === 'Parcel');
    const dineInRevenue = dineInOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const parcelRevenue = parcelOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Top items
    const itemMap = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Daily breakdown
    const dailyMap = {};
    orders.forEach(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, dineIn: 0, parcel: 0, total: 0 };
      dailyMap[day].orders++;
      dailyMap[day].total += o.totalAmount;
      if (o.orderType === 'Dine-in') dailyMap[day].dineIn += o.totalAmount;
      else dailyMap[day].parcel += o.totalAmount;
    });
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      period,
      dateRange: { start, end },
      totalRevenue,
      totalOrders: orders.length,
      dineInOrders: dineInOrders.length,
      parcelOrders: parcelOrders.length,
      dineInRevenue,
      parcelRevenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      topItems,
      dailyBreakdown
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
      Order.find({ status: 'Paid', createdAt: { $gte: today } }),
      Order.countDocuments({ status: 'Paid' }),
      Order.countDocuments({ status: { $ne: 'Paid' } })
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
    const { start, end } = getDateRange(period);

    const orders = await Order.find({
      status: 'Paid',
      createdAt: { $gte: start, $lte: end }
    }).sort('createdAt');

    // Build CSV
    let csv = 'Date,Order ID,Type,Table,Section,Customer,Items,Total Amount\n';
    orders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-IN');
      const items = o.items.map(i => `${i.name}x${i.quantity}`).join('; ');
      const customer = o.orderType === 'Parcel' ? `${o.customerName} (${o.customerPhone})` : 'Walk-in';
      const table = o.tableId || '-';
      const section = o.section || '-';
      csv += `${date},${o._id},${o.orderType},${table},${section},"${customer}","${items}",${o.totalAmount}\n`;
    });

    // Summary row
    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    csv += `\n,,,,,,TOTAL,${total}\n`;
    csv += `,,,,,,GST (5%),${(total * 0.05).toFixed(2)}\n`;
    csv += `,,,,,,GRAND TOTAL,${(total * 1.05).toFixed(2)}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="archearc-sales-${period}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
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
  console.log('  [ANALYTICS]    GET   /api/analytics/sales, /api/analytics/summary');
  console.log('  [HEALTH]       GET   /api/health\n');
});
