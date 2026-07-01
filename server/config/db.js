const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 uses the new connection string parser and unified topology by default
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy global unique indexes asynchronously after connection succeeds
    const db = conn.connection.db;
    Promise.all([
      db.collection('products').dropIndex('sku_1').catch(() => {}),
      db.collection('products').dropIndex('barcode_1').catch(() => {}),
      db.collection('products').dropIndex('productId_1').catch(() => {}),
      db.collection('bills').dropIndex('billNumber_1').catch(() => {}),
      db.collection('coupons').dropIndex('code_1').catch(() => {})
    ]).then(() => {
      console.log('Legacy global indexes checked and dropped if they existed.');
    }).catch((err) => {
      console.error('Error checking/dropping legacy indexes:', err.message);
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
