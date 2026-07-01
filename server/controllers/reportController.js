const Bill = require('../models/Bill');
const Product = require('../models/Product');
const DailyIncome = require('../models/DailyIncome');

/**
 * GET /api/reports/dashboard
 * Dashboard summary: today's stats + quick overview.
 */
const getDashboard = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Today's bills
    const todayBills = await Bill.aggregate([
      {
        $match: {
          shop: shopId,
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalGst: { $sum: '$totalGst' },
          totalDiscount: { $sum: '$discount' },
          billCount: { $sum: 1 },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]);

    const todayStats = todayBills[0] || {
      totalRevenue: 0,
      totalGst: 0,
      totalDiscount: 0,
      billCount: 0,
      itemsSold: 0,
    };

    // Product stats
    const [totalProducts, lowStockCount, expiringCount] = await Promise.all([
      Product.countDocuments({ shop: shopId, isActive: true }),
      Product.countDocuments({
        shop: shopId,
        isActive: true,
        $expr: { $lte: ['$stock', '$minStockLevel'] },
      }),
      Product.countDocuments({
        shop: shopId,
        isActive: true,
        expiryDate: {
          $ne: null,
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date(),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        today: {
          revenue: Math.round(todayStats.totalRevenue * 100) / 100,
          gstCollected: Math.round(todayStats.totalGst * 100) / 100,
          discountGiven: Math.round(todayStats.totalDiscount * 100) / 100,
          billCount: todayStats.billCount,
          itemsSold: todayStats.itemsSold,
        },
        inventory: {
          totalProducts,
          lowStockCount,
          expiringCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/daily
 * Daily income report for a date range.
 * Query: ?startDate=2026-01-01&endDate=2026-01-31
 */
const getDailyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const reports = await DailyIncome.find({
      shop: req.user.shop,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Calculate totals
    const totals = reports.reduce(
      (acc, r) => ({
        totalRevenue: acc.totalRevenue + r.totalRevenue,
        totalCost: acc.totalCost + r.totalCost,
        totalProfit: acc.totalProfit + r.totalProfit,
        totalGst: acc.totalGst + r.totalGstCollected,
        totalDiscount: acc.totalDiscount + r.totalDiscount,
        totalBills: acc.totalBills + r.billCount,
        totalItems: acc.totalItems + r.itemsSold,
      }),
      {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalGst: 0,
        totalDiscount: 0,
        totalBills: 0,
        totalItems: 0,
      }
    );

    res.json({
      success: true,
      data: {
        reports,
        totals: {
          ...totals,
          totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
          totalCost: Math.round(totals.totalCost * 100) / 100,
          totalProfit: Math.round(totals.totalProfit * 100) / 100,
          totalGst: Math.round(totals.totalGst * 100) / 100,
          totalDiscount: Math.round(totals.totalDiscount * 100) / 100,
        },
        period: {
          from: start,
          to: end,
          days: reports.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales-analytics
 * Sales analytics: top products, category breakdown, hourly distribution.
 * Query: ?startDate=&endDate=&limit=10
 */
const getSalesAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const shopId = req.user.shop;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      $match: {
        shop: shopId,
        createdAt: { $gte: start, $lte: end },
      },
    };

    // Top selling products
    const topProducts = await Bill.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.itemTotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
    ]);

    // Category-wise sales
    const categorySales = await Bill.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.category',
          totalRevenue: { $sum: '$items.itemTotal' },
          totalQuantity: { $sum: '$items.quantity' },
          billCount: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          category: '$_id',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalQuantity: 1,
          billCount: { $size: '$billCount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Hourly sales distribution
    const hourlySales = await Bill.aggregate([
      matchStage,
      {
        $group: {
          _id: { $hour: '$createdAt' },
          revenue: { $sum: '$grandTotal' },
          billCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          hour: '$_id',
          revenue: { $round: ['$revenue', 2] },
          billCount: 1,
        },
      },
    ]);

    // Revenue trend (daily)
    const revenueTrend = await Bill.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$grandTotal' },
          billCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          billCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        topProducts,
        categorySales,
        hourlySales,
        revenueTrend,
        period: { from: start, to: end },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/profit-loss
 * Profit/Loss report.
 * Query: ?startDate=&endDate=
 */
const getProfitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.user.shop;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const result = await Bill.aggregate([
      {
        $match: {
          shop: shopId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.itemTotal' },
          totalCost: {
            $sum: { $multiply: ['$items.costPriceAtSale', '$items.quantity'] },
          },
          totalGst: {
            $sum: { $add: ['$items.cgst', '$items.sgst'] },
          },
          totalItems: { $sum: '$items.quantity' },
          billIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalCost: { $round: ['$totalCost', 2] },
          totalGst: { $round: ['$totalGst', 2] },
          grossProfit: { $round: [{ $subtract: ['$totalRevenue', '$totalCost'] }, 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] },
                  100,
                ],
              },
              2,
            ],
          },
          totalItems: 1,
          billCount: { $size: '$billIds' },
        },
      },
    ]);

    const data = result[0] || {
      totalRevenue: 0,
      totalCost: 0,
      totalGst: 0,
      grossProfit: 0,
      profitMargin: 0,
      totalItems: 0,
      billCount: 0,
    };

    // Discount totals
    const discountResult = await Bill.aggregate([
      {
        $match: {
          shop: shopId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: '$discount' },
        },
      },
    ]);

    data.totalDiscount = discountResult[0] ? Math.round(discountResult[0].totalDiscount * 100) / 100 : 0;
    data.netProfit = Math.round((data.grossProfit - data.totalDiscount) * 100) / 100;

    res.json({
      success: true,
      data: {
        ...data,
        period: { from: start, to: end },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/gst
 * GST report with CGST/SGST breakdown.
 * Query: ?startDate=&endDate=
 */
const getGSTReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.user.shop;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // GST breakdown by rate
    const gstByRate = await Bill.aggregate([
      {
        $match: {
          shop: shopId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.gstRate',
          taxableAmount: {
            $sum: {
              $subtract: ['$items.itemTotal', { $add: ['$items.cgst', '$items.sgst'] }],
            },
          },
          totalCgst: { $sum: '$items.cgst' },
          totalSgst: { $sum: '$items.sgst' },
          totalGst: { $sum: { $add: ['$items.cgst', '$items.sgst'] } },
          itemCount: { $sum: '$items.quantity' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          gstRate: '$_id',
          taxableAmount: { $round: ['$taxableAmount', 2] },
          totalCgst: { $round: ['$totalCgst', 2] },
          totalSgst: { $round: ['$totalSgst', 2] },
          totalGst: { $round: ['$totalGst', 2] },
          itemCount: 1,
        },
      },
    ]);

    // Overall totals
    const totals = gstByRate.reduce(
      (acc, g) => ({
        taxableAmount: acc.taxableAmount + g.taxableAmount,
        totalCgst: acc.totalCgst + g.totalCgst,
        totalSgst: acc.totalSgst + g.totalSgst,
        totalGst: acc.totalGst + g.totalGst,
      }),
      { taxableAmount: 0, totalCgst: 0, totalSgst: 0, totalGst: 0 }
    );

    res.json({
      success: true,
      data: {
        breakdown: gstByRate,
        totals: {
          taxableAmount: Math.round(totals.taxableAmount * 100) / 100,
          totalCgst: Math.round(totals.totalCgst * 100) / 100,
          totalSgst: Math.round(totals.totalSgst * 100) / 100,
          totalGst: Math.round(totals.totalGst * 100) / 100,
        },
        period: { from: start, to: end },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getDailyReport,
  getSalesAnalytics,
  getProfitLoss,
  getGSTReport,
};
