
const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro');
  console.log('Connected to DB');

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const orders = await Order.find({
    createdAt: { $gte: start }
  });

  console.log(`Found ${orders.length} orders for today.`);
  
  orders.forEach(o => {
    console.log(`Order #${o.orderNumber}: Status=${o.status}, Mode=${o.paymentMode}, Type=${o.paymentType}, Total=${o.totalAmount}, Cash=${o.cashAmount}, Online=${o.onlineAmount}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
