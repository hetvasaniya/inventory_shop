/**
 * Real Inventory Seeder — D-Mart / General Store Style
 * =====================================================
 * Usage: node seeders/realInventory.js
 * 
 * This script adds realistic grocery, household, personal care, dairy, and
 * snack products with genuine Indian market prices and supplier info.
 *
 * Run from inside the /server directory.
 */

const path = require('path');
const fs = require('fs');

// Load env
const envLocal = path.join(__dirname, '../.env');
const envParent = path.join(__dirname, '../../.env');
if (fs.existsSync(envLocal)) require('dotenv').config({ path: envLocal });
else if (fs.existsSync(envParent)) require('dotenv').config({ path: envParent });

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in environment variables.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
};

// ──────────────────────────────────────────────────────────────────────────
// SUPPLIERS — Common Indian FMCG Distributors / Wholesalers
// ──────────────────────────────────────────────────────────────────────────
const SUPPLIER_DATA = [
  {
    name: 'Ramesh Grocery Distributors',
    contactPerson: 'Ramesh Patel',
    phone: '9876543210',
    email: 'ramesh.distributors@gmail.com',
    address: { street: '12, APMC Yard', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  },
  {
    name: 'Amul Dairy Products Pvt Ltd',
    contactPerson: 'Suresh Mehta',
    phone: '9988776655',
    email: 'supply@amuldairy.co.in',
    address: { street: 'Amul Dairy Road, Anand', city: 'Anand', state: 'Gujarat', pincode: '388001' },
  },
  {
    name: 'HUL Distributor — Maharashtra Zone',
    contactPerson: 'Vikram Singh',
    phone: '9876512345',
    email: 'hul.mz.dist@hul.net.in',
    address: { street: '45, MIDC Road', city: 'Pune', state: 'Maharashtra', pincode: '411019' },
  },
  {
    name: 'Nestlé India Regional Depot',
    contactPerson: 'Anjali Sharma',
    phone: '9123456789',
    email: 'nestle.depot@nestle.in',
    address: { street: 'Plot 7, Industrial Area', city: 'Delhi', state: 'Delhi', pincode: '110020' },
  },
  {
    name: 'Parle Biscuits Wholesale Hub',
    contactPerson: 'Mahesh Joshi',
    phone: '9000123456',
    email: 'parle.wholesale@parle.com',
    address: { street: '8, Vile Parle East', city: 'Mumbai', state: 'Maharashtra', pincode: '400057' },
  },
  {
    name: 'P&G Consumer Goods Distributor',
    contactPerson: 'Ritu Agarwal',
    phone: '9811112222',
    email: 'pg.dist@pgindia.com',
    address: { street: '33, Ring Road Market', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  },
  {
    name: 'Marico Products Depot',
    contactPerson: 'Deepak Naidu',
    phone: '9344556677',
    email: 'marico.depot@marico.com',
    address: { street: '22, Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
  },
  {
    name: 'Britannia & Horlicks Distributor',
    contactPerson: 'Priya Nair',
    phone: '9446677889',
    email: 'brit.horlicks@dist.in',
    address: { street: '5th Block, Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
  },
];

// ──────────────────────────────────────────────────────────────────────────
// PRODUCTS — Realistic D-Mart style inventory with genuine Indian prices
// ──────────────────────────────────────────────────────────────────────────
// supplierKey maps to SUPPLIER_DATA index
const PRODUCT_DATA = [
  // ── GROCERIES ──────────────────────────────────────────────────────────
  { name: 'Basmati Rice Premium 5kg', category: 'Groceries', brand: 'India Gate', costPrice: 420, sellingPrice: 485, stock: 60, minStockLevel: 20, targetStockLevel: 100, gstRate: 5, unit: 'bag', supplierKey: 0 },
  { name: 'Basmati Rice Economy 1kg', category: 'Groceries', brand: 'Dawat', costPrice: 78, sellingPrice: 95, stock: 80, minStockLevel: 30, targetStockLevel: 150, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Toor Dal 1kg', category: 'Groceries', brand: 'Rajdhani', costPrice: 120, sellingPrice: 145, stock: 50, minStockLevel: 20, targetStockLevel: 100, gstRate: 0, unit: 'pcs', supplierKey: 0 },
  { name: 'Moong Dal 500g', category: 'Groceries', brand: 'Rajdhani', costPrice: 65, sellingPrice: 82, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 0, unit: 'pcs', supplierKey: 0 },
  { name: 'Chana Dal 1kg', category: 'Groceries', brand: 'Fortune', costPrice: 85, sellingPrice: 105, stock: 35, minStockLevel: 15, targetStockLevel: 70, gstRate: 0, unit: 'pcs', supplierKey: 0 },
  { name: 'Wheat Atta 5kg', category: 'Groceries', brand: 'Aashirvaad', costPrice: 188, sellingPrice: 225, stock: 45, minStockLevel: 15, targetStockLevel: 80, gstRate: 5, unit: 'bag', supplierKey: 0 },
  { name: 'Wheat Atta 10kg', category: 'Groceries', brand: 'Aashirvaad', costPrice: 368, sellingPrice: 440, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 5, unit: 'bag', supplierKey: 0 },
  { name: 'Maida 1kg', category: 'Groceries', brand: 'Pillsbury', costPrice: 38, sellingPrice: 48, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Sunflower Oil 1L', category: 'Groceries', brand: 'Saffola', costPrice: 130, sellingPrice: 155, stock: 55, minStockLevel: 20, targetStockLevel: 100, gstRate: 5, unit: 'bottle', supplierKey: 6 },
  { name: 'Sunflower Oil 5L', category: 'Groceries', brand: 'Fortune', costPrice: 610, sellingPrice: 730, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 5, unit: 'bottle', supplierKey: 6 },
  { name: 'Mustard Oil 1L', category: 'Groceries', brand: 'Patanjali', costPrice: 140, sellingPrice: 165, stock: 30, minStockLevel: 12, targetStockLevel: 60, gstRate: 5, unit: 'bottle', supplierKey: 0 },
  { name: 'Sugar 1kg', category: 'Groceries', brand: 'Madhur', costPrice: 40, sellingPrice: 50, stock: 70, minStockLevel: 25, targetStockLevel: 150, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Salt 1kg', category: 'Groceries', brand: 'Tata Salt', costPrice: 20, sellingPrice: 28, stock: 90, minStockLevel: 30, targetStockLevel: 180, gstRate: 0, unit: 'pcs', supplierKey: 0 },
  { name: 'Turmeric Powder 200g', category: 'Groceries', brand: 'Everest', costPrice: 38, sellingPrice: 50, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Red Chilli Powder 200g', category: 'Groceries', brand: 'MDH', costPrice: 55, sellingPrice: 72, stock: 35, minStockLevel: 12, targetStockLevel: 70, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Garam Masala 50g', category: 'Groceries', brand: 'MDH', costPrice: 32, sellingPrice: 42, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Poha (Flattened Rice) 500g', category: 'Groceries', brand: 'Patanjali', costPrice: 30, sellingPrice: 38, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 0, unit: 'pcs', supplierKey: 0 },

  // ── DAIRY ──────────────────────────────────────────────────────────────
  { name: 'Full Cream Milk 1L', category: 'Dairy', brand: 'Amul', costPrice: 58, sellingPrice: 68, stock: 50, minStockLevel: 30, targetStockLevel: 100, gstRate: 5, unit: 'pcs', supplierKey: 1 },
  { name: 'Toned Milk 500ml', category: 'Dairy', brand: 'Amul', costPrice: 28, sellingPrice: 34, stock: 60, minStockLevel: 30, targetStockLevel: 120, gstRate: 5, unit: 'pcs', supplierKey: 1 },
  { name: 'Amul Butter 100g', category: 'Dairy', brand: 'Amul', costPrice: 52, sellingPrice: 62, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 12, unit: 'pcs', supplierKey: 1 },
  { name: 'Amul Butter 500g', category: 'Dairy', brand: 'Amul', costPrice: 228, sellingPrice: 268, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 12, unit: 'pcs', supplierKey: 1 },
  { name: 'Amul Cheese Slice 200g', category: 'Dairy', brand: 'Amul', costPrice: 85, sellingPrice: 105, stock: 20, minStockLevel: 10, targetStockLevel: 40, gstRate: 12, unit: 'pcs', supplierKey: 1 },
  { name: 'Curd 400g', category: 'Dairy', brand: 'Amul', costPrice: 32, sellingPrice: 40, stock: 40, minStockLevel: 20, targetStockLevel: 80, gstRate: 5, unit: 'pcs', supplierKey: 1 },
  { name: 'Paneer 200g', category: 'Dairy', brand: 'Amul', costPrice: 68, sellingPrice: 88, stock: 15, minStockLevel: 8, targetStockLevel: 30, gstRate: 5, unit: 'pcs', supplierKey: 1 },
  { name: 'Ghee 500ml', category: 'Dairy', brand: 'Amul', costPrice: 275, sellingPrice: 330, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 12, unit: 'bottle', supplierKey: 1 },

  // ── BEVERAGES ──────────────────────────────────────────────────────────
  { name: 'Tata Tea Premium 250g', category: 'Beverages', brand: 'Tata Tea', costPrice: 105, sellingPrice: 130, stock: 45, minStockLevel: 15, targetStockLevel: 80, gstRate: 5, unit: 'pcs', supplierKey: 0 },
  { name: 'Red Label Tea 500g', category: 'Beverages', brand: 'Brooke Bond', costPrice: 200, sellingPrice: 245, stock: 30, minStockLevel: 12, targetStockLevel: 60, gstRate: 5, unit: 'pcs', supplierKey: 2 },
  { name: 'Nescafe Classic 50g', category: 'Beverages', brand: 'Nescafe', costPrice: 148, sellingPrice: 185, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'pcs', supplierKey: 3 },
  { name: 'Bru Coffee 100g', category: 'Beverages', brand: 'Bru', costPrice: 155, sellingPrice: 195, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Horlicks 500g', category: 'Beverages', brand: 'Horlicks', costPrice: 195, sellingPrice: 248, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'pcs', supplierKey: 7 },
  { name: 'Coca-Cola 1.25L', category: 'Beverages', brand: 'Coca-Cola', costPrice: 60, sellingPrice: 80, stock: 60, minStockLevel: 24, targetStockLevel: 120, gstRate: 28, unit: 'bottle', supplierKey: 0 },
  { name: 'Pepsi 2L', category: 'Beverages', brand: 'Pepsi', costPrice: 80, sellingPrice: 105, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 28, unit: 'bottle', supplierKey: 0 },
  { name: 'Sprite 750ml', category: 'Beverages', brand: 'Sprite', costPrice: 38, sellingPrice: 50, stock: 50, minStockLevel: 24, targetStockLevel: 100, gstRate: 28, unit: 'bottle', supplierKey: 0 },
  { name: 'Frooti 200ml', category: 'Beverages', brand: 'Frooti', costPrice: 15, sellingPrice: 20, stock: 80, minStockLevel: 30, targetStockLevel: 150, gstRate: 18, unit: 'pcs', supplierKey: 0 },
  { name: 'Real Juice Orange 1L', category: 'Beverages', brand: 'Real', costPrice: 82, sellingPrice: 110, stock: 30, minStockLevel: 12, targetStockLevel: 60, gstRate: 12, unit: 'pcs', supplierKey: 0 },

  // ── SNACKS ─────────────────────────────────────────────────────────────
  { name: 'Parle-G Biscuit 800g', category: 'Snacks', brand: 'Parle', costPrice: 50, sellingPrice: 62, stock: 70, minStockLevel: 25, targetStockLevel: 140, gstRate: 12, unit: 'pcs', supplierKey: 4 },
  { name: 'Britannia Good Day 150g', category: 'Snacks', brand: 'Britannia', costPrice: 28, sellingPrice: 38, stock: 60, minStockLevel: 20, targetStockLevel: 120, gstRate: 12, unit: 'pcs', supplierKey: 7 },
  { name: 'Hide & Seek 120g', category: 'Snacks', brand: 'Parle', costPrice: 32, sellingPrice: 42, stock: 50, minStockLevel: 20, targetStockLevel: 100, gstRate: 12, unit: 'pcs', supplierKey: 4 },
  { name: 'Kurkure Masala Munch 90g', category: 'Snacks', brand: 'Kurkure', costPrice: 22, sellingPrice: 30, stock: 80, minStockLevel: 30, targetStockLevel: 150, gstRate: 18, unit: 'pcs', supplierKey: 5 },
  { name: 'Lay\'s Classic Salted 50g', category: 'Snacks', brand: 'Lay\'s', costPrice: 18, sellingPrice: 25, stock: 80, minStockLevel: 30, targetStockLevel: 150, gstRate: 18, unit: 'pcs', supplierKey: 5 },
  { name: 'Haldiram Bhujia 400g', category: 'Snacks', brand: 'Haldiram\'s', costPrice: 78, sellingPrice: 100, stock: 35, minStockLevel: 12, targetStockLevel: 70, gstRate: 12, unit: 'pcs', supplierKey: 0 },
  { name: 'Maggi Noodles 70g (Pack of 4)', category: 'Snacks', brand: 'Maggi', costPrice: 60, sellingPrice: 76, stock: 60, minStockLevel: 24, targetStockLevel: 120, gstRate: 12, unit: 'pack', supplierKey: 3 },
  { name: 'Yippee Noodles 70g', category: 'Snacks', brand: 'Sunfeast', costPrice: 14, sellingPrice: 19, stock: 90, minStockLevel: 30, targetStockLevel: 180, gstRate: 12, unit: 'pcs', supplierKey: 2 },
  { name: 'Handkerchief Cotton 6-Pack', category: 'Other', brand: 'Generic', costPrice: 55, sellingPrice: 90, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 5, unit: 'pack', supplierKey: 0 },
  { name: 'Chewing Gum Center Fresh 30pc', category: 'Snacks', brand: 'Center Fresh', costPrice: 28, sellingPrice: 35, stock: 50, minStockLevel: 20, targetStockLevel: 100, gstRate: 18, unit: 'pcs', supplierKey: 0 },

  // ── PERSONAL CARE ──────────────────────────────────────────────────────
  { name: 'Colgate Strong Teeth 200g', category: 'Personal Care', brand: 'Colgate', costPrice: 95, sellingPrice: 120, stock: 45, minStockLevel: 15, targetStockLevel: 90, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Pepsodent Toothpaste 150g', category: 'Personal Care', brand: 'Pepsodent', costPrice: 72, sellingPrice: 92, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Close-Up Toothpaste 80g', category: 'Personal Care', brand: 'Close-Up', costPrice: 42, sellingPrice: 55, stock: 35, minStockLevel: 12, targetStockLevel: 70, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Colgate Toothbrush Medium', category: 'Personal Care', brand: 'Colgate', costPrice: 28, sellingPrice: 38, stock: 50, minStockLevel: 15, targetStockLevel: 100, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Dettol Soap 125g', category: 'Personal Care', brand: 'Dettol', costPrice: 42, sellingPrice: 55, stock: 60, minStockLevel: 20, targetStockLevel: 120, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Lux Soap 100g', category: 'Personal Care', brand: 'Lux', costPrice: 35, sellingPrice: 45, stock: 70, minStockLevel: 25, targetStockLevel: 140, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Lifebuoy Soap 125g', category: 'Personal Care', brand: 'Lifebuoy', costPrice: 30, sellingPrice: 40, stock: 60, minStockLevel: 20, targetStockLevel: 120, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Dettol Handwash 250ml', category: 'Personal Care', brand: 'Dettol', costPrice: 78, sellingPrice: 99, stock: 30, minStockLevel: 12, targetStockLevel: 60, gstRate: 18, unit: 'bottle', supplierKey: 2 },
  { name: 'Dove Shampoo 180ml', category: 'Personal Care', brand: 'Dove', costPrice: 115, sellingPrice: 148, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'bottle', supplierKey: 2 },
  { name: 'Head & Shoulders Shampoo 180ml', category: 'Personal Care', brand: 'H&S', costPrice: 148, sellingPrice: 188, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'bottle', supplierKey: 5 },
  { name: 'Pantene Conditioner 180ml', category: 'Personal Care', brand: 'Pantene', costPrice: 130, sellingPrice: 165, stock: 15, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'bottle', supplierKey: 5 },
  { name: 'Gillette Mach 3 Razor', category: 'Personal Care', brand: 'Gillette', costPrice: 145, sellingPrice: 190, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 5 },
  { name: 'Whisper Ultra Soft 7 Pads', category: 'Personal Care', brand: 'Whisper', costPrice: 38, sellingPrice: 50, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 12, unit: 'pack', supplierKey: 5 },
  { name: 'Nivea Cream 50ml', category: 'Personal Care', brand: 'Nivea', costPrice: 68, sellingPrice: 90, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 0 },
  { name: 'Vaseline Body Lotion 200ml', category: 'Personal Care', brand: 'Vaseline', costPrice: 95, sellingPrice: 125, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'bottle', supplierKey: 2 },
  { name: 'Parachute Coconut Oil 500ml', category: 'Personal Care', brand: 'Parachute', costPrice: 148, sellingPrice: 188, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'bottle', supplierKey: 6 },

  // ── HOUSEHOLD ──────────────────────────────────────────────────────────
  { name: 'Surf Excel Quick Wash 1kg', category: 'Household', brand: 'Surf Excel', costPrice: 190, sellingPrice: 240, stock: 30, minStockLevel: 12, targetStockLevel: 60, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Ariel Complete 1kg', category: 'Household', brand: 'Ariel', costPrice: 200, sellingPrice: 252, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'pcs', supplierKey: 5 },
  { name: 'Harpic Toilet Cleaner 500ml', category: 'Household', brand: 'Harpic', costPrice: 72, sellingPrice: 95, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 18, unit: 'bottle', supplierKey: 2 },
  { name: 'Vim Dishwash Bar 400g', category: 'Household', brand: 'Vim', costPrice: 42, sellingPrice: 56, stock: 40, minStockLevel: 15, targetStockLevel: 80, gstRate: 18, unit: 'pcs', supplierKey: 2 },
  { name: 'Colin Glass Cleaner 500ml', category: 'Household', brand: 'Colin', costPrice: 58, sellingPrice: 78, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'bottle', supplierKey: 5 },
  { name: 'Mortein Spray 625ml', category: 'Household', brand: 'Mortein', costPrice: 198, sellingPrice: 258, stock: 15, minStockLevel: 6, targetStockLevel: 30, gstRate: 18, unit: 'bottle', supplierKey: 2 },
  { name: 'Good Knight Liquid Refill 45ml', category: 'Household', brand: 'Good Knight', costPrice: 58, sellingPrice: 75, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 0 },
  { name: 'Scotch Brite Scrub Pad (3-Pack)', category: 'Household', brand: 'Scotch-Brite', costPrice: 32, sellingPrice: 45, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 18, unit: 'pack', supplierKey: 0 },

  // ── BABY PRODUCTS ──────────────────────────────────────────────────────
  { name: 'Johnson\'s Baby Powder 200g', category: 'Baby Products', brand: 'Johnson\'s', costPrice: 95, sellingPrice: 125, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 3 },
  { name: 'Pampers Pants M (30 Pcs)', category: 'Baby Products', brand: 'Pampers', costPrice: 375, sellingPrice: 499, stock: 15, minStockLevel: 5, targetStockLevel: 30, gstRate: 12, unit: 'pack', supplierKey: 5 },
  { name: 'Cerelac 300g Stage 1', category: 'Baby Products', brand: 'Cerelac', costPrice: 178, sellingPrice: 230, stock: 15, minStockLevel: 5, targetStockLevel: 30, gstRate: 12, unit: 'pcs', supplierKey: 3 },

  // ── STATIONERY ─────────────────────────────────────────────────────────
  { name: 'Classmate Notebook A4 200 Pages', category: 'Stationery', brand: 'Classmate', costPrice: 58, sellingPrice: 80, stock: 30, minStockLevel: 10, targetStockLevel: 60, gstRate: 12, unit: 'pcs', supplierKey: 0 },
  { name: 'Cello Pen Blue (10-Pack)', category: 'Stationery', brand: 'Cello', costPrice: 52, sellingPrice: 70, stock: 25, minStockLevel: 10, targetStockLevel: 50, gstRate: 12, unit: 'pack', supplierKey: 0 },
  { name: 'Fevicol 100g', category: 'Stationery', brand: 'Fevicol', costPrice: 28, sellingPrice: 38, stock: 20, minStockLevel: 8, targetStockLevel: 40, gstRate: 18, unit: 'pcs', supplierKey: 0 },
];

// ──────────────────────────────────────────────────────────────────────────
// SEEDER MAIN
// ──────────────────────────────────────────────────────────────────────────
const seed = async () => {
  await connectDB();

  // Get all shops
  const shops = await Shop.find({}).lean();
  if (shops.length === 0) {
    console.error('❌ No shops found. Please create an account and shop first.');
    process.exit(1);
  }

  for (const shop of shops) {
    const shopId = shop._id;
    console.log(`\n📦 Seeding inventory for shop: ${shop.name || shopId}`);

    // 1. Create or find suppliers
    const supplierIds = [];
    for (const sd of SUPPLIER_DATA) {
      let supplier = await Supplier.findOne({ shop: shopId, name: sd.name });
      if (!supplier) {
        supplier = await Supplier.create({ ...sd, shop: shopId });
        console.log(`  ✅ Supplier created: ${sd.name}`);
      } else {
        console.log(`  ⏭  Supplier exists: ${sd.name}`);
      }
      supplierIds.push(supplier._id);
    }

    // 2. Create products (skip if already exists by name)
    let createdCount = 0;
    let skippedCount = 0;
    for (const pd of PRODUCT_DATA) {
      const exists = await Product.findOne({ shop: shopId, name: pd.name });
      if (exists) {
        skippedCount++;
        continue;
      }
      const { supplierKey, ...productData } = pd;
      await Product.create({
        ...productData,
        supplier: supplierIds[supplierKey] || null,
        shop: shopId,
        isActive: true,
      });
      createdCount++;
    }

    console.log(`  ✅ Products created: ${createdCount}`);
    console.log(`  ⏭  Products skipped (already exist): ${skippedCount}`);
  }

  console.log('\n🎉 Real inventory seeding complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeder error:', err);
  process.exit(1);
});
