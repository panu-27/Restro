const Order = require('../models/Order');
const Table = require('../models/Table');

exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $nin: ['Paid', 'Cancelled'] } }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { tableId, section, orderType } = req.body;
    const newOrder = new Order(req.body);
    await newOrder.save();

    // Sync with Table model for Dine-in orders
    if (orderType === 'Dine-in' && tableId && section) {
      const updateField = `sections.${section}.status`;
      const idField = `sections.${section}.orderId`;
      await Table.findOneAndUpdate(
        { tableId },
        { [updateField]: 'Occupied', [idField]: newOrder._id },
        { upsert: true }
      );
    }
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, customerPhone } = req.body;
    const updateFields = { status };
    if (customerPhone !== undefined && customerPhone !== '') {
      updateFields.customerPhone = customerPhone;
    }
    const order = await Order.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Table State Management
    if (order.orderType === 'Dine-in') {
      const tableUpdate = {};
      if (status === 'Paid' || status === 'Cancelled') {
        tableUpdate[`sections.${order.section}.status`] = 'Available';
        tableUpdate[`sections.${order.section}.orderId`] = null;
      } else if (status === 'Served') {
        tableUpdate[`sections.${order.section}.status`] = 'Served';
      }
      
      if (Object.keys(tableUpdate).length > 0) {
        await Table.findOneAndUpdate({ tableId: order.tableId }, tableUpdate);
      }
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const type = req.query.type || 'All';

    let query = {};

    if (type && type !== 'All') {
      query.orderType = type;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { tableId: { $regex: search, $options: 'i' } }
      ];
      
      if (!isNaN(search) && search.trim() !== '') {
        query.$or.push({ orderNumber: parseInt(search) });
      }
    }

    const total = await Order.countDocuments(query);
    const pages = Math.ceil(total / limit) || 1;

    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ orders, pages, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
