const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Order = require('./models/Order');

async function clearTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Attempt to update ALL non-Paid orders to Paid
    const result = await Order.updateMany(
      { status: { $ne: 'Paid' } },
      { $set: { status: 'Paid' } }
    );
    console.log(`Updated ${result.modifiedCount} orders.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

clearTables();
