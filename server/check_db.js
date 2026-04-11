const mongoose = require('mongoose');
require('dotenv').config();
const ArcheUser = require('./models/User');
const Subscription = require('./models/Subscription');

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro');
  const users = await ArcheUser.find().populate('subscription');
  const subs = await Subscription.find();
  console.log('Users:', JSON.stringify(users, null, 2));
  console.log('Subscriptions:', JSON.stringify(subs, null, 2));
  process.exit(0);
}

checkDB();
