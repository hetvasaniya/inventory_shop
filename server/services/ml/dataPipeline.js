/**
 * ML Data Pipeline
 * Extracts, cleans, engineers features, and formats datasets from MongoDB for ML models.
 */
const Product = require('../../models/Product');
const Bill = require('../../models/Bill');
const PurchaseOrder = require('../../models/PurchaseOrder');

/**
 * Fetch all raw shop data required for ML
 */
async function extractShopMLData(shopId) {
  const [products, bills, purchaseOrders] = await Promise.all([
    Product.find({ shop: shopId, isActive: true }).lean(),
    Bill.find({ shop: shopId }).sort({ createdAt: 1 }).lean(),
    PurchaseOrder.find({ shop: shopId }).lean(),
  ]);

  return { products, bills, purchaseOrders };
}

/**
 * Build daily sales timeline for each product and store-wide
 */
function buildDailySalesTimeline(bills, products) {
  const productMap = new Map();
  products.forEach((p) => {
    productMap.set(p._id.toString(), {
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      sellingPrice: p.sellingPrice,
      costPrice: p.costPrice,
      stock: p.stock,
      minStockLevel: p.minStockLevel || 10,
      targetStockLevel: p.targetStockLevel || 50,
      salesByDate: {}, // 'YYYY-MM-DD': quantity
      revenueByDate: {},
      totalUnitsSold: 0,
      totalRevenue: 0,
      orderCount: 0,
    });
  });

  const storeDailySales = {}; // 'YYYY-MM-DD': { quantity, revenue, billCount }

  bills.forEach((bill) => {
    const dateStr = new Date(bill.createdAt).toISOString().split('T')[0];

    if (!storeDailySales[dateStr]) {
      storeDailySales[dateStr] = { date: dateStr, quantity: 0, revenue: 0, billCount: 0 };
    }
    storeDailySales[dateStr].revenue += bill.grandTotal || 0;
    storeDailySales[dateStr].billCount += 1;

    (bill.items || []).forEach((item) => {
      const prodId = item.productId ? item.productId.toString() : null;
      const qty = item.quantity || 0;
      const rev = item.itemTotal || (item.priceAtSale * qty) || 0;

      storeDailySales[dateStr].quantity += qty;

      if (prodId && productMap.has(prodId)) {
        const prod = productMap.get(prodId);
        prod.salesByDate[dateStr] = (prod.salesByDate[dateStr] || 0) + qty;
        prod.revenueByDate[dateStr] = (prod.revenueByDate[dateStr] || 0) + rev;
        prod.totalUnitsSold += qty;
        prod.totalRevenue += rev;
        prod.orderCount += 1;
      }
    });
  });

  return {
    productsWithTimeline: Array.from(productMap.values()),
    storeDailyTimeline: Object.values(storeDailySales).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Generate feature rows for Demand Forecasting (Supervised Regression)
 * Features:
 * - Lag 1 (previous day sales)
 * - Lag 7 (previous 7-day sales sum)
 * - Lag 30 (previous 30-day sales sum)
 * - Rolling 7-day average
 * - Day of week (0-6)
 * - Month (1-12)
 * - Selling price
 * - Current stock
 * Target:
 * - Next day sales (or N-day demand)
 */
function createDemandFeatures(productsWithTimeline, storeDailyTimeline) {
  const dates = storeDailyTimeline.map((d) => d.date);
  const rows = [];

  productsWithTimeline.forEach((prod) => {
    // Need at least 8 days of data to compute lag 7
    if (dates.length < 8) return;

    for (let i = 7; i < dates.length; i++) {
      const targetDate = dates[i];
      const actualSales = prod.salesByDate[targetDate] || 0;

      const lag1 = prod.salesByDate[dates[i - 1]] || 0;

      let lag7Sum = 0;
      for (let j = 1; j <= 7; j++) {
        lag7Sum += prod.salesByDate[dates[i - j]] || 0;
      }
      const rolling7Avg = lag7Sum / 7;

      let lag30Sum = 0;
      const window30 = Math.min(i, 30);
      for (let j = 1; j <= window30; j++) {
        lag30Sum += prod.salesByDate[dates[i - j]] || 0;
      }
      const rolling30Avg = lag30Sum / window30;

      const dObj = new Date(targetDate);
      const dayOfWeek = dObj.getDay();
      const month = dObj.getMonth() + 1;

      rows.push({
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        date: targetDate,
        features: [
          lag1,
          lag7Sum,
          rolling7Avg,
          rolling30Avg,
          dayOfWeek,
          month,
          prod.sellingPrice,
          prod.stock,
        ],
        target: actualSales,
      });
    }
  });

  return rows;
}

/**
 * Generate classification dataset for Stock Risk Prediction
 * Classes:
 * 0: Low Risk (Inventory >= 14 days of average demand)
 * 1: Medium Risk (Inventory between 5 and 14 days of demand)
 * 2: High Risk (Inventory < 5 days of demand or <= minStockLevel)
 */
function createStockRiskFeatures(productsWithTimeline, storeDailyTimeline) {
  const daysOfHistory = Math.max(1, storeDailyTimeline.length);
  const rows = [];

  productsWithTimeline.forEach((prod) => {
    const totalSold = prod.totalUnitsSold;
    const avgDailySales = totalSold / daysOfHistory;

    // Previous 7-day sales
    const last7Dates = storeDailyTimeline.slice(-7).map((d) => d.date);
    const prev7Sales = last7Dates.reduce((acc, dt) => acc + (prod.salesByDate[dt] || 0), 0);

    // Previous 30-day sales
    const last30Dates = storeDailyTimeline.slice(-30).map((d) => d.date);
    const prev30Sales = last30Dates.reduce((acc, dt) => acc + (prod.salesByDate[dt] || 0), 0);

    // Trend: difference between 7d daily rate and 30d daily rate
    const dailyRate7 = prev7Sales / Math.max(1, last7Dates.length);
    const dailyRate30 = prev30Sales / Math.max(1, last30Dates.length);
    const demandTrend = dailyRate7 - dailyRate30;

    const supplierDeliveryLeadDays = 4; // realistic supplier delivery time
    const stock = prod.stock;
    const minStock = prod.minStockLevel || 10;

    const daysLeft = avgDailySales > 0 ? Number((stock / avgDailySales).toFixed(1)) : 999;

    let riskClass = 0; // Low
    let riskLabel = 'Low Risk';
    if (stock <= 0 || stock <= minStock || daysLeft < 5) {
      riskClass = 2; // High
      riskLabel = 'High Risk';
    } else if (daysLeft < 14 || stock < minStock * 1.5) {
      riskClass = 1; // Medium
      riskLabel = 'Medium Risk';
    }

    rows.push({
      productId: prod.id,
      productName: prod.name,
      category: prod.category,
      stock,
      minStockLevel: minStock,
      avgDailySales: Number(avgDailySales.toFixed(2)),
      prev7Sales,
      prev30Sales,
      demandTrend: Number(demandTrend.toFixed(2)),
      supplierDeliveryLeadDays,
      daysLeft: daysLeft > 999 ? 999 : daysLeft,
      features: [
        stock,
        avgDailySales,
        prev7Sales,
        prev30Sales,
        demandTrend,
        supplierDeliveryLeadDays,
        minStock,
      ],
      target: riskClass,
      targetLabel: riskLabel,
    });
  });

  return rows;
}

/**
 * Generate feature vectors for Product Segmentation (K-Means Clustering)
 */
function createProductSegmentationFeatures(productsWithTimeline, storeDailyTimeline) {
  const days = Math.max(1, storeDailyTimeline.length);

  return productsWithTimeline.map((p) => {
    const totalSales = p.totalUnitsSold;
    const avgSales = Number((totalSales / days).toFixed(2));
    const revenue = Number(p.totalRevenue.toFixed(2));
    const stock = p.stock;
    const price = p.sellingPrice;
    const frequency = p.orderCount;

    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      rawFeatures: [totalSales, avgSales, revenue, stock, price, frequency],
      metrics: {
        totalSales,
        avgSales,
        revenue,
        stock,
        price,
        frequency,
      },
    };
  });
}

/**
 * Extract multi-item transaction baskets from bills for Apriori Algorithm
 */
function extractTransactionBaskets(bills) {
  const baskets = [];

  bills.forEach((bill) => {
    if (!bill.items || bill.items.length === 0) return;
    const uniqueItems = new Set();
    bill.items.forEach((item) => {
      const name = item.name ? item.name.trim() : null;
      if (name) uniqueItems.add(name);
    });
    if (uniqueItems.size > 0) {
      baskets.push(Array.from(uniqueItems));
    }
  });

  return baskets;
}

/**
 * 80/20 Train / Test split helper
 */
function trainTestSplit(data, trainRatio = 0.8) {
  if (!data || data.length === 0) {
    return { train: [], test: [] };
  }
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  const splitIndex = Math.max(1, Math.floor(shuffled.length * trainRatio));
  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

module.exports = {
  extractShopMLData,
  buildDailySalesTimeline,
  createDemandFeatures,
  createStockRiskFeatures,
  createProductSegmentationFeatures,
  extractTransactionBaskets,
  trainTestSplit,
};
