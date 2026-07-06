const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== USERS collection indexes ===');
    const userIndexes = await db.collection('users').indexes();
    userIndexes.forEach(i => console.log('  ', JSON.stringify(i)));

    console.log('\n=== SHOPS collection indexes ===');
    const shopIndexes = await db.collection('shops').indexes();
    shopIndexes.forEach(i => console.log('  ', JSON.stringify(i)));

    console.log('\n=== ALL Users ===');
    const users = await db.collection('users').find({}).project({ passwordHash: 0, refreshToken: 0 }).toArray();
    if (users.length === 0) console.log('  (no users)');
    else users.forEach(u => console.log('  ', JSON.stringify(u)));

    console.log('\n=== ALL Shops ===');
    const shops = await db.collection('shops').find({}).toArray();
    if (shops.length === 0) console.log('  (no shops)');
    else shops.forEach(s => console.log('  ', JSON.stringify(s)));

    // Also check all collection names
    console.log('\n=== ALL Collections ===');
    const collections = await db.listCollections().toArray();
    collections.forEach(c => console.log('  ', c.name));

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
