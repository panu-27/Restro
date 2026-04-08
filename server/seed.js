/**
 * ArcheArc Restro - Database Seed Script
 * Run: node seed.js
 * Creates: Admin user, menu items, and 12 tables
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ArcheUser = require('./models/User');
const Menu = require('./models/Menu');
const Table = require('./models/Table');

async function seed() {
  try {
    console.log('\n🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/archearc-restro', {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✓ Connected\n');

    // -------- CLEAR --------
    await Promise.all([Menu.deleteMany({}), ArcheUser.deleteMany({}), Table.deleteMany({})]);
    console.log('✓ Cleared old data');

    // -------- MENU --------
    const menuItems = [
      { name: 'Butter Chicken', category: 'Non-Veg', price: 350 },
      { name: 'Chicken Tikka', category: 'Non-Veg', price: 320 },
      { name: 'Mutton Rogan Josh', category: 'Non-Veg', price: 420 },
      { name: 'Dal Makhani', category: 'Veg', price: 220 },
      { name: 'Paneer Butter Masala', category: 'Veg', price: 280 },
      { name: 'Sarson Da Saag', category: 'Veg', price: 240 },
      { name: 'Chana Masala', category: 'Veg', price: 200 },
      { name: 'Aloo Gobi', category: 'Veg', price: 180 },
      { name: 'Butter Naan', category: 'Veg', price: 45 },
      { name: 'Tandoori Roti', category: 'Veg', price: 25 },
      { name: 'Makki Di Roti', category: 'Veg', price: 35 },
      { name: 'Steamed Rice', category: 'Veg', price: 80 },
      { name: 'Biryani (Veg)', category: 'Veg', price: 220 },
      { name: 'Biryani (Chicken)', category: 'Non-Veg', price: 280 },
      { name: 'Lassi (Sweet)', category: 'Beverage', price: 80 },
      { name: 'Lassi (Salted)', category: 'Beverage', price: 80 },
      { name: 'Masala Chai', category: 'Beverage', price: 30 },
      { name: 'Cold Drink', category: 'Beverage', price: 40 },
      { name: 'Gulab Jamun', category: 'Dessert', price: 60 },
      { name: 'Kheer', category: 'Dessert', price: 80 },
    ];
    await Menu.insertMany(menuItems);
    console.log(`✓ Menu seeded (${menuItems.length} items)`);

    // -------- ADMIN USER --------
    // Hash password manually here to bypass any pre-save hook issues
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);

    await ArcheUser.collection.insertOne({
      name: 'ArcheArc Admin',
      email: 'admin@archearc.com',
      password: hashedPassword,
      role: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Admin created: admin@archearc.com / admin123');

    // -------- TABLES --------
    const tables = Array.from({ length: 12 }, (_, i) => ({
      tableId: `Table ${i + 1}`,
      sections: {
        A: { status: 'Available', orderId: null },
        B: { status: 'Available', orderId: null },
        C: { status: 'Available', orderId: null },
        D: { status: 'Available', orderId: null }
      },
      lastUpdated: new Date()
    }));
    await Table.insertMany(tables);
    console.log('✓ 12 tables initialized');

    console.log('\n╔════════════════════════════════════╗');
    console.log('║   DATABASE SEEDED SUCCESSFULLY!   ║');
    console.log('╚════════════════════════════════════╝\n');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
