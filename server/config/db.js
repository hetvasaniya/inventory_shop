const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 uses the new connection string parser and unified topology by default
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const db = conn.connection.db;

    // ── Drop legacy / stale indexes ─────────────────────────────────────────
    // These are dropped silently — if the index doesn't exist the error is swallowed.
    //
    // WHY shops.gstin_1 is listed here:
    //   The original Shop schema had `gstin: { unique: true }`.
    //   That was removed from the schema (gstin is now optional with no uniqueness
    //   constraint), but MongoDB keeps index definitions on disk independently of
    //   the Mongoose schema. Until this index is dropped, any two registrations
    //   that both submit an empty GSTIN (stored as '') will collide on the unique
    //   index and return a 409 Duplicate Key error — even though the schema no
    //   longer requests uniqueness on that field.
    Promise.all([
      // Products collection
      db.collection('products').dropIndex('sku_1').catch(() => {}),
      db.collection('products').dropIndex('barcode_1').catch(() => {}),
      db.collection('products').dropIndex('productId_1').catch(() => {}),
      // Bills collection
      db.collection('bills').dropIndex('billNumber_1').catch(() => {}),
      // Coupons collection
      db.collection('coupons').dropIndex('code_1').catch(() => {}),
      // Shops collection — drop stale unique index on gstin
      db.collection('shops').dropIndex('gstin_1').catch(() => {}),
    ]).then(() => {
      console.log('Legacy / stale indexes checked and dropped if they existed.');
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
