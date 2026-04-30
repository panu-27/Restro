require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./models/Table');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro')
  .then(async () => {
    try {
      const user = await User.findOne();
      if (!user) {
        console.log('No user found');
        return process.exit(1);
      }

      await Table.deleteMany({ userId: user._id });
      console.log('Deleted existing tables');

      const tables = [];
      
      // Main Floor
      for(let i=1; i<=10; i++) {
        tables.push({ tableId: 'T'+i, seats: 4, area: 'Main Floor', userId: user._id });
      }
      
      // 1st Floor
      for(let i=1; i<=10; i++) {
        tables.push({ tableId: '1ST-T'+i, seats: 4, area: '1st Floor', userId: user._id });
      }
      
      // 2nd Floor
      for(let i=1; i<=10; i++) {
        tables.push({ tableId: '2F-T'+i, seats: 4, area: '2nd Floor', userId: user._id });
      }

      await Table.insertMany(tables);
      console.log('Inserted default 10 tables in each floor');

      // Update user tableAreas if needed
      user.tableAreas = ['Main Floor', '1st Floor', '2nd Floor'];
      await user.save();

      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
