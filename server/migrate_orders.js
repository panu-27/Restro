const mongoose = require('mongoose');
const Order = require('./models/Order');

async function migrate() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/archearc-restro');
    console.log('Connected to DB');

    // Group orders by day
    const orders = await Order.find({}).sort('createdAt');
    console.log(`Processing ${orders.length} orders...`);

    const dailyCounts = {};

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyCounts[dateKey]) dailyCounts[dateKey] = 0;
      dailyCounts[dateKey]++;
      
      order.orderNumber = dailyCounts[dateKey];
      await order.save();
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
