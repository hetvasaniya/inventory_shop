/**
 * cleanup-db.js
 * ─────────────────────────────────────────────────────────────────
 * Run this ONCE to:
 *   1. Drop the stale `gstin_1` unique index from the shops collection
 *      (this is the root cause of the 409 error when GSTIN is empty)
 *   2. Print all users and shops currently in the database
 *      (so you can decide which orphaned records to delete)
 *
 * Usage:
 *   node server/cleanup-db.js
 *
 * Delete this file after running. It is a one-time maintenance script.
 * ─────────────────────────────────────────────────────────────────
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanup() {
  console.log('Connecting to:', process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // ── 1. Drop stale gstin_1 unique index ───────────────────────────────────
  console.log('=== Dropping stale indexes ===');
  try {
    await db.collection('shops').dropIndex('gstin_1');
    console.log('✓ shops.gstin_1 index dropped (this was causing the 409 on empty GSTIN)');
  } catch (e) {
    if (e.code === 27) {
      console.log('✓ shops.gstin_1 index not found — already removed or never existed');
    } else {
      console.log('✗ Error dropping gstin_1:', e.message);
    }
  }

  // ── 2. Show all remaining indexes on shops ───────────────────────────────
  console.log('\n=== Current indexes on shops collection ===');
  const shopIndexes = await db.collection('shops').indexes();
  shopIndexes.forEach(idx => console.log(' ', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : ''));

  // ── 3. Show current documents ────────────────────────────────────────────
  console.log('\n=== Users in database ===');
  const users = await db.collection('users').find({}, { projection: { email: 1, role: 1, shop: 1, createdAt: 1 } }).toArray();
  if (users.length === 0) {
    console.log('  (none)');
  } else {
    users.forEach(u => {
      console.log(`  _id: ${u._id} | email: ${u.email} | role: ${u.role} | shop: ${u.shop} | created: ${u.createdAt}`);
    });
  }

  console.log('\n=== Shops in database ===');
  const shops = await db.collection('shops').find({}, { projection: { shopName: 1, gstin: 1, owner: 1, createdAt: 1 } }).toArray();
  if (shops.length === 0) {
    console.log('  (none)');
  } else {
    shops.forEach(s => {
      console.log(`  _id: ${s._id} | shopName: ${s.shopName} | gstin: "${s.gstin}" | owner: ${s.owner} | created: ${s.createdAt}`);
    });
  }

  // ── 4. Detect orphaned records ───────────────────────────────────────────
  console.log('\n=== Orphan detection ===');

  // Users whose shop ObjectId doesn't exist in shops collection
  for (const u of users) {
    if (u.shop) {
      const linkedShop = await db.collection('shops').findOne({ _id: u.shop });
      if (!linkedShop) {
        console.log(`  ⚠ ORPHAN USER: ${u.email} (shop ref ${u.shop} not found in shops collection)`);
      }
    }
  }

  // Shops whose owner ObjectId doesn't exist in users collection
  for (const s of shops) {
    if (s.owner) {
      const linkedUser = await db.collection('users').findOne({ _id: s.owner });
      if (!linkedUser) {
        console.log(`  ⚠ ORPHAN SHOP: "${s.shopName}" (owner ref ${s.owner} not found in users collection)`);
      }
    }
  }

  if (users.length === 0 && shops.length === 0) {
    console.log('  No documents found — database is clean.');
  }

  // ── 5. Optional: delete ALL users and shops (uncomment to wipe test data) ─
  // WARNING: This deletes everything in the users and shops collections.
  // Only uncomment this during development when you want a fresh start.
  //
  // await db.collection('users').deleteMany({});
  // await db.collection('shops').deleteMany({});
  // console.log('\n✓ All users and shops deleted (fresh start).');

  await mongoose.disconnect();
  console.log('\nDone. You can now try registering again.');
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
