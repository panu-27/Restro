const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' }); // Adjust if .env is not in root
const ArcheUser = require('./models/User');
const Menu = require('./models/Menu');
const Table = require('./models/Table');

const fixMissingData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro', {
            serverSelectionTimeoutMS: 10000,
        });

        const users = await ArcheUser.find({});
        for (const user of users) {
             const tableCount = await Table.countDocuments({ userId: user._id });
             const menuCount = await Menu.countDocuments({ userId: user._id });
             
             if (tableCount === 0) {
                const defaultTables = [];
                for (let i = 1; i <= 10; i++) {
                    defaultTables.push({ tableId: `T${i}`, seats: 4, userId: user._id });
                }
                await Table.insertMany(defaultTables);
                console.log(`Created 10 default tables for user ${user._id}`);
             }

             if (menuCount === 0) {
                const defaultMenu = [
                    { name: 'Paneer Butter Masala', category: 'Veg', price: 250, userId: user._id },
                    { name: 'Chicken Tikka', category: 'Non-Veg', price: 300, userId: user._id },
                    { name: 'Coke', category: 'Beverage', price: 60, userId: user._id },
                    { name: 'Gulab Jamun', category: 'Dessert', price: 100, userId: user._id }
                  ];
                  await Menu.insertMany(defaultMenu);
                  console.log(`Created default menu for user ${user._id}`);
             }
        }

        console.log('Fixed missing data gracefully.');
        process.exit(0);
    } catch (err) {
        console.error('Script failed:', err.message);
        process.exit(1);
    }
};

fixMissingData();
