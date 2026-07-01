const mongoose = require('mongoose');

const dailyIncomeSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    totalGstCollected: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    billCount: {
      type: Number,
      default: 0,
    },
    itemsSold: {
      type: Number,
      default: 0,
    },
    topSellingProducts: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        revenue: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one record per shop per day
dailyIncomeSchema.index({ shop: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyIncome', dailyIncomeSchema);
