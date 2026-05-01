const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Notification = require('./server/models/Notification');

mongoose.connect('mongodb://127.0.0.1:27017/restro')
  .then(async () => {
    console.log("Connected to DB");
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    console.log("Last Order:", {
       _id: lastOrder?._id,
       status: lastOrder?.status,
       createdBy: lastOrder?.createdBy,
       userId: lastOrder?.userId
    });
    
    const lastNotifs = await Notification.find().sort({ createdAt: -1 }).limit(3);
    console.log("Latest Notifications:", lastNotifs);
    process.exit(0);
  })
  .catch(console.error);
