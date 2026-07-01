const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');

const Shop = require('../models/Shop');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Coupon = require('../models/Coupon');
const Bill = require('../models/Bill');
const DailyIncome = require('../models/DailyIncome');

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Clearing old database data...');
    await Shop.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await Coupon.deleteMany({});
    await Bill.deleteMany({});
    await DailyIncome.deleteMany({});
    console.log('Database cleared.');

    // 1. Create Shop
    console.log('Creating sample Shop...');
    const shop = await Shop.create({
      shopName: 'H-Mart Supermarket',
      gstin: '27AAAAA1111A1Z1', // Valid format for mock testing
      address: {
        street: '123 Main Bazaar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      phone: '9876543210',
      email: 'contact@hmart.com',
      currency: 'INR',
      gstState: 'Maharashtra',
    });
    console.log(`Shop created: ${shop.shopName}`);

    // 2. Create Owner User
    console.log('Creating Owner User...');
    const ownerPassword = await bcrypt.hash('password123', 12);
    const owner = await User.create({
      name: 'Aditya Sharma',
      email: 'owner@hmart.com',
      phone: '9988776655',
      passwordHash: 'password123', // hooks will trigger bcrypt inside save if not hashed, wait, User model has a pre('save') hook:
      // userSchema.pre('save', async function (next) {
      //   if (!this.isModified('passwordHash')) return next();
      //   const salt = await bcrypt.genSalt(12);
      //   this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
      // But wait! If we write raw password, the userSchema.pre('save') hook will hash it automatically! So we pass 'password123' directly.
      role: 'owner',
      shop: shop._id,
    });
    
    // Link owner back to shop
    shop.owner = owner._id;
    await shop.save();
    console.log(`Owner created: ${owner.email}`);

    // 3. Create Cashier User
    console.log('Creating Cashier User...');
    const cashier = await User.create({
      name: 'Rohan Patil',
      email: 'cashier@hmart.com',
      phone: '9988665544',
      passwordHash: 'password123', // will be hashed by pre-save hook
      role: 'employee',
      shop: shop._id,
    });
    console.log(`Cashier created: ${cashier.email}`);

    // 4. Create Supplier
    console.log('Creating Supplier...');
    const supplier = await Supplier.create({
      name: 'A1 Grocery Distributors',
      contactPerson: 'Suresh Mehta',
      email: 'suresh@a1distributors.com',
      phone: '9822334455',
      gstin: '27BBBBB2222B2Z2',
      address: {
        street: 'Gala 4, APMC Market',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        pincode: '400703',
      },
      shop: shop._id,
    });
    console.log(`Supplier created: ${supplier.name}`);

    // 5. Create Coupons
    console.log('Creating Coupons...');
    const welcomeCoupon = await Coupon.create({
      code: 'WELCOME100',
      description: 'Flat ₹100 off on orders above ₹1000',
      discountType: 'flat',
      discountValue: 100,
      minOrderAmount: 1000,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      shop: shop._id,
    });

    const promoCoupon = await Coupon.create({
      code: 'SAVE10',
      description: '10% off on all orders, max discount ₹200',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 200,
      maxDiscountAmount: 200,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      shop: shop._id,
    });
    console.log('Coupons created.');

    // 6. Create Products
    console.log('Creating Products...');
    const productsData = [
      {
        name: 'Organic Apples',
        category: 'Fruits & Vegetables',
        costPrice: 80,
        sellingPrice: 120,
        stock: 150,
        unit: 'kg',
        minStockLevel: 20,
        gstRate: 0,
        hsnCode: '08081000',
      },
      {
        name: 'Amul Butter 500g',
        category: 'Dairy',
        costPrice: 210,
        sellingPrice: 250,
        stock: 80,
        unit: 'pcs',
        minStockLevel: 15,
        gstRate: 12,
        hsnCode: '04051000',
      },
      {
        name: 'Basmati Rice Premium 5kg',
        category: 'Groceries',
        costPrice: 450,
        sellingPrice: 599,
        stock: 5, // LOW STOCK test
        unit: 'pack',
        minStockLevel: 10,
        gstRate: 5,
        hsnCode: '10063020',
      },
      {
        name: 'Coca-Cola 1.25L',
        category: 'Beverages',
        costPrice: 55,
        sellingPrice: 75,
        stock: 200,
        unit: 'pcs',
        minStockLevel: 30,
        gstRate: 28,
        hsnCode: '22021010',
      },
      {
        name: 'Tata Salt 1kg',
        category: 'Groceries',
        costPrice: 20,
        sellingPrice: 28,
        stock: 300,
        unit: 'pcs',
        minStockLevel: 50,
        gstRate: 0,
        hsnCode: '25010020',
      },
      {
        name: 'Dettol Liquid Handwash 750ml Refill',
        category: 'Personal Care',
        costPrice: 110,
        sellingPrice: 149,
        stock: 45,
        unit: 'pcs',
        minStockLevel: 12,
        gstRate: 18,
        hsnCode: '34013011',
      },
    ];

    const products = [];
    for (const p of productsData) {
      const prod = await Product.create({
        ...p,
        supplier: supplier._id,
        shop: shop._id,
      });
      products.push(prod);
    }
    console.log(`Created ${products.length} products.`);

    // 7. Create Sample Bills (for last 3 days to populate charts)
    console.log('Creating historical Sales Data & Bills...');
    const now = new Date();

    // Helper for bill items
    const getBillItems = (prodList, qtys) => {
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalCost = 0;

      const items = prodList.map((prod, idx) => {
        const qty = qtys[idx];
        const baseAmount = (prod.sellingPrice / (1 + prod.gstRate / 100)) * qty;
        const totalTax = prod.sellingPrice * qty - baseAmount;
        const cgst = totalTax / 2;
        const sgst = totalTax / 2;
        const itemTotal = prod.sellingPrice * qty;

        subtotal += baseAmount;
        totalCgst += cgst;
        totalSgst += sgst;
        totalCost += prod.costPrice * qty;

        return {
          productId: prod._id,
          sku: prod.sku,
          name: prod.name,
          quantity: qty,
          priceAtSale: prod.sellingPrice,
          costPriceAtSale: prod.costPrice,
          gstRate: prod.gstRate,
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          itemTotal: Math.round(itemTotal * 100) / 100,
          hsnCode: prod.hsnCode,
        };
      });

      return {
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalGst: Math.round((totalCgst + totalSgst) * 100) / 100,
        grandTotal: Math.round((subtotal + totalCgst + totalSgst) * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    };

    // Day -2
    const date2 = new Date(now);
    date2.setDate(now.getDate() - 2);
    const billDetails2 = getBillItems([products[0], products[1], products[3]], [2, 1, 4]); // Apples, Butter, Coke
    const bill2 = await Bill.create({
      ...billDetails2,
      paymentMethod: 'cash',
      paymentDetails: { amountPaid: 1000, change: 1000 - billDetails2.grandTotal },
      customer: { name: 'Aarav Mehta', phone: '9811223344', email: 'aarav@gmail.com' },
      billedBy: cashier._id,
      shop: shop._id,
      createdAt: date2,
    });

    // Day -1
    const date1 = new Date(now);
    date1.setDate(now.getDate() - 1);
    const billDetails1 = getBillItems([products[1], products[4]], [2, 3]); // Butter, Tata Salt
    const bill1 = await Bill.create({
      ...billDetails1,
      paymentMethod: 'cash',
      paymentDetails: { amountPaid: 600, change: 600 - billDetails1.grandTotal },
      customer: { name: 'Pooja Patil', phone: '9822334455', email: 'pooja@gmail.com' },
      billedBy: cashier._id,
      shop: shop._id,
      createdAt: date1,
    });

    // Today
    const billDetailsToday = getBillItems([products[0], products[5]], [3, 2]); // Apples, Dettol Handwash
    const billToday = await Bill.create({
      ...billDetailsToday,
      paymentMethod: 'cash',
      paymentDetails: { amountPaid: 700, change: 700 - billDetailsToday.grandTotal },
      customer: { name: 'Walk-in Customer', phone: '', email: '' },
      billedBy: cashier._id,
      shop: shop._id,
      createdAt: now,
    });

    console.log('Sample Bills generated successfully.');

    // 8. Generate DailyIncome records for these days
    console.log('Generating DailyIncome Records...');
    const daysData = [
      { date: date2, billData: billDetails2 },
      { date: date1, billData: billDetails1 },
      { date: now, billData: billDetailsToday },
    ];

    for (const day of daysData) {
      const d = new Date(day.date);
      d.setHours(0, 0, 0, 0);

      const itemsSold = day.billData.items.reduce((sum, item) => sum + item.quantity, 0);
      const profit = Math.round((day.billData.grandTotal - day.billData.totalCost) * 100) / 100;

      await DailyIncome.create({
        date: d,
        totalRevenue: day.billData.grandTotal,
        totalCost: day.billData.totalCost,
        totalProfit: profit,
        totalGstCollected: day.billData.totalGst,
        totalDiscount: 0,
        billCount: 1,
        itemsSold: itemsSold,
        shop: shop._id,
      });
    }
    console.log('DailyIncome records created successfully.');

    console.log('=========================================');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('You can now log in using:');
    console.log('  Owner Email:    owner@hmart.com');
    console.log('  Cashier Email:  cashier@hmart.com');
    console.log('  Password:       password123');
    console.log('=========================================');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
