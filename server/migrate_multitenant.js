const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' }); // Adjust if .env is not in root
const ArcheUser = require('./models/User');
const Menu = require('./models/Menu');
const Order = require('./models/Order');
const Table = require('./models/Table');

const runMigration = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro', {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('MongoDB Connected correctly.');

        // Find existing users
        const users = await ArcheUser.find({});
        console.log(`Found ${users.length} users.`);
        
        // Find Rohit's user by matching his name or mobile
        const owner = users.find(u => u.name.toLowerCase().includes('rohit') || u.mobileNumber === '9022646279' || u.role === 'Admin' || u.role === 'Staff');
        
        if (!owner) {
            console.log('No user found to assign data to. Please create a user first.');
            process.exit(0);
        }

        console.log(`Assigning existing data to user: ${owner.name} (${owner._id})`);

        // Assign Menus
        const menusRes = await Menu.updateMany({ userId: { $exists: false } }, { $set: { userId: owner._id } });
        console.log(`Updated ${menusRes.modifiedCount} Menu items.`);

        // Assign Orders
        const ordersRes = await Order.updateMany({ userId: { $exists: false } }, { $set: { userId: owner._id } });
        console.log(`Updated ${ordersRes.modifiedCount} Orders.`);

        // Assign Tables
        const tablesRes = await Table.updateMany({ userId: { $exists: false } }, { $set: { userId: owner._id } });
        console.log(`Updated ${tablesRes.modifiedCount} Tables.`);
        
        console.log('Migration Complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

runMigration();
