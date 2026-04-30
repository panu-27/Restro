require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./models/Table');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro')
  .then(async () => {
    try {
      const users = await User.find();
      console.log(`Found ${users.length} users`);

      await Table.deleteMany({});
      console.log('Deleted ALL existing tables from the database');

      // Helper: first 3 alphanumeric chars, first letter capitalized
      const getAreaPrefix = (name) => {
        const chars = String(name || '').trim().replace(/[^a-zA-Z0-9]/g, '');
        if (!chars) return 'FLR';
        const prefix = chars.slice(0, 3);
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      };

      let tablesToInsert = [];
      const floors = ['Main Floor', '1st Floor', '2nd Floor'];
      
      for (const user of users) {
        for (const floor of floors) {
          const isMain = floor.toLowerCase() === 'main floor';
          const prefix = isMain ? '' : getAreaPrefix(floor);
          for (let i = 1; i <= 10; i++) {
            const tableId = isMain ? `T${i}` : `${prefix}-T${i}`;
            tablesToInsert.push({ tableId, seats: 4, area: floor, userId: user._id });
          }
        }
        
        try {
          await User.updateOne({ _id: user._id }, { $set: { tableAreas: ['Main Floor', '1st Floor', '2nd Floor'] } });
        } catch (e) {
          // ignore
        }
      }

      await Table.insertMany(tablesToInsert);
      console.log(`Inserted 30 default tables for each of the ${users.length} users`);

      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
