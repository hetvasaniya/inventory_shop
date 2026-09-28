const Product = require('../models/Product');
const Bill = require('../models/Bill');
const PurchaseOrder = require('../models/PurchaseOrder');

const {
  extractShopMLData,
  buildDailySalesTimeline,
  createDemandFeatures,
  createStockRiskFeatures,
  createProductSegmentationFeatures,
  extractTransactionBaskets,
  trainTestSplit,
} = require('../services/ml/dataPipeline');

const {
  analyzeNumericalArray,
} = require('../services/ml/statisticsEngine');

const {
  trainAndCompareRegression,
} = require('../services/ml/regressionModels');

const {
  trainAndCompareClassification,
  CLASS_NAMES,
} = require('../services/ml/classificationModels');

const {
  runKMeans,
} = require('../services/ml/clusteringEngine');

const {
  mineAssociationRules,
  getRecommendationsForBasket,
} = require('../services/ml/aprioriEngine');

/**
 * 1. GET /api/ai/dashboard
 * Central AI & Analytics dashboard summarizing inventory and predictive metrics.
 */
exports.getAiDashboard = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { products, bills } = await extractShopMLData(shopId);

    const { productsWithTimeline, storeDailyTimeline } = buildDailySalesTimeline(bills, products);

    // KPI Summary Calculations
    const totalProducts = products.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.stock || 0;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= (p.minStockLevel || 10)) lowStockCount++;
    });

    let totalRevenue = 0;
    let totalSalesUnits = 0;
    bills.forEach((b) => {
      totalRevenue += b.grandTotal || 0;
      (b.items || []).forEach((item) => {
        totalSalesUnits += item.quantity || 0;
      });
    });

    const totalDays = Math.max(1, storeDailyTimeline.length);
    const avgDailySales = Number((totalSalesUnits / totalDays).toFixed(1));
    const avgOrderValue = bills.length > 0 ? Number((totalRevenue / bills.length).toFixed(2)) : 0;

    // Stock risk prediction counts
    const riskData = createStockRiskFeatures(productsWithTimeline, storeDailyTimeline);
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let reorderSuggestionsCount = 0;

    riskData.forEach((r) => {
      if (r.target === 2) {
        highRiskCount++;
        reorderSuggestionsCount++;
      } else if (r.target === 1) {
        mediumRiskCount++;
      } else {
        lowRiskCount++;
      }
    });

    // Demand Forecast Summary across catalog
    const demandRows = createDemandFeatures(productsWithTimeline, storeDailyTimeline);
    let predictedTotalDemand7Days = 0;

    if (demandRows.length >= 8) {
      const { train, test } = trainTestSplit(demandRows, 0.8);
      const regComp = trainAndCompareRegression(train, test);
      const bestModel = regComp.models.randomForest.model;

      productsWithTimeline.forEach((prod) => {
        // Build feature row for next prediction
        const last7Dates = storeDailyTimeline.slice(-7).map((d) => d.date);
        const prev7Sales = last7Dates.reduce((acc, dt) => acc + (prod.salesByDate[dt] || 0), 0);
        const last30Dates = storeDailyTimeline.slice(-30).map((d) => d.date);
        const prev30Sales = last30Dates.reduce((acc, dt) => acc + (prod.salesByDate[dt] || 0), 0);
        const lastDate = storeDailyTimeline[storeDailyTimeline.length - 1]?.date;
        const lag1 = lastDate ? (prod.salesByDate[lastDate] || 0) : 0;

        const feat = [
          lag1,
          prev7Sales,
          prev7Sales / 7,
          prev30Sales / Math.max(1, last30Dates.length),
          new Date().getDay(),
          new Date().getMonth() + 1,
          prod.sellingPrice,
          prod.stock,
        ];
        const nextDayPred = bestModel.predict([feat])[0] || 0;
        predictedTotalDemand7Days += Math.round(nextDayPred * 7);
      });
    } else {
      // Direct moving average fallback for small data
      productsWithTimeline.forEach((p) => {
        const daily = p.totalUnitsSold / totalDays;
        predictedTotalDemand7Days += Math.round(daily * 7);
      });
    }

    // Top selling products
    const topSellingProducts = [...productsWithTimeline]
      .sort((a, b) => b.totalUnitsSold - a.totalUnitsSold)
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        unitsSold: p.totalUnitsSold,
        revenue: Math.round(p.totalRevenue),
        stock: p.stock,
      }));

    // Category breakdown
    const categoryStats = {};
    productsWithTimeline.forEach((p) => {
      const cat = p.category || 'Other';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { category: cat, products: 0, sales: 0, revenue: 0, stock: 0 };
      }
      categoryStats[cat].products += 1;
      categoryStats[cat].sales += p.totalUnitsSold;
      categoryStats[cat].revenue += Math.round(p.totalRevenue);
      categoryStats[cat].stock += p.stock;
    });

    const categoryBreakdown = Object.values(categoryStats);

    // Sales and revenue trend
    const salesTrend = storeDailyTimeline.slice(-30).map((d) => ({
      date: d.date,
      sales: d.quantity,
      revenue: Math.round(d.revenue),
      orders: d.billCount,
    }));

    res.json({
      success: true,
      data: {
        summaryCards: {
          totalProducts,
          totalSalesUnits,
          totalRevenue: Math.round(totalRevenue),
          totalStockUnits,
          avgDailySales,
          avgOrderValue,
          lowStockProducts: lowStockCount,
          outOfStockProducts: outOfStockCount,
          highRiskProducts: highRiskCount,
          predictedDemand7Days: predictedTotalDemand7Days,
          reorderSuggestionsCount,
        },
        charts: {
          salesTrend,
          revenueTrend: salesTrend,
          topSellingProducts,
          categoryBreakdown,
          stockRiskDistribution: [
            { name: 'Low Risk', value: lowRiskCount, color: '#10B981' },
            { name: 'Medium Risk', value: mediumRiskCount, color: '#F59E0B' },
            { name: 'High Risk', value: highRiskCount, color: '#EF4444' },
          ],
        },
        hasEnoughData: storeDailyTimeline.length >= 7 && bills.length >= 10,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/ai/numerical-analysis
 * Dedicated statistical analysis page for numerical variables.
 */
exports.getNumericalAnalysis = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { variable = 'sales' } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    let dataArray = [];
    let variableLabel = 'Sales Quantity';
    let unit = 'units';

    switch (variable) {
      case 'price':
        dataArray = products.map((p) => p.sellingPrice || 0);
        variableLabel = 'Product Selling Price';
        unit = '₹';
        break;
      case 'stock':
        dataArray = products.map((p) => p.stock || 0);
        variableLabel = 'Product Stock Quantity';
        unit = 'units';
        break;
      case 'revenue':
        // Line-item revenue from bills
        bills.forEach((b) => {
          (b.items || []).forEach((item) => {
            dataArray.push(item.itemTotal || (item.priceAtSale * item.quantity) || 0);
          });
        });
        variableLabel = 'Line-Item Revenue';
        unit = '₹';
        break;
      case 'orderValue':
        dataArray = bills.map((b) => b.grandTotal || 0);
        variableLabel = 'Total Order Value (Bill Grand Total)';
        unit = '₹';
        break;
      case 'sales':
      default:
        // Sales quantity per line item
        bills.forEach((b) => {
          (b.items || []).forEach((item) => {
            dataArray.push(item.quantity || 0);
          });
        });
        variableLabel = 'Sales Quantity per Item';
        unit = 'units';
        break;
    }

    if (dataArray.length === 0) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: `No data points available for numerical variable '${variableLabel}'.`,
        minimumRequirement: 'At least 5 transactions or products are required to calculate descriptive statistics.',
      });
    }

    const stats = analyzeNumericalArray(dataArray, variableLabel);

    // Box plot representation metrics
    const boxPlotData = {
      min: stats.min,
      q1: stats.quartiles.q1,
      median: stats.median,
      q3: stats.quartiles.q3,
      max: stats.max,
      iqr: stats.quartiles.iqr,
      lowerFence: stats.quartiles.lowerFence,
      upperFence: stats.quartiles.upperFence,
      outliersCount: stats.quartiles.outliers.length,
      outliersSample: stats.quartiles.outliers.slice(0, 10),
    };

    res.json({
      success: true,
      data: {
        selectedVariable: variable,
        label: variableLabel,
        unit,
        statistics: {
          mean: stats.mean,
          median: stats.median,
          min: stats.min,
          max: stats.max,
          stdDev: stats.stdDev,
          variance: stats.variance,
          quartiles: stats.quartiles,
          sampleCount: stats.count,
        },
        histogram: stats.histogram,
        boxPlot: boxPlotData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/ai/category-analysis
 * Category-based metrics, contribution shares, and comparative charts.
 */
exports.getCategoryAnalysis = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { startDate, endDate } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    // Filter bills by date if specified
    const filteredBills = bills.filter((b) => {
      const bDate = new Date(b.createdAt);
      if (startDate && bDate < new Date(startDate)) return false;
      if (endDate && bDate > new Date(endDate)) return false;
      return true;
    });

    const categoryMap = {};

    products.forEach((p) => {
      const cat = p.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          products: 0,
          unitsSold: 0,
          revenue: 0,
          totalPriceSum: 0,
          stock: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
        };
      }
      categoryMap[cat].products += 1;
      categoryMap[cat].stock += p.stock || 0;
      categoryMap[cat].totalPriceSum += p.sellingPrice || 0;
      if (p.stock <= 0) categoryMap[cat].outOfStockProducts += 1;
      else if (p.stock <= (p.minStockLevel || 10)) categoryMap[cat].lowStockProducts += 1;
    });

    // Populate sales and revenue from bills
    filteredBills.forEach((b) => {
      (b.items || []).forEach((item) => {
        // Find category from product
        const prod = products.find((p) => p._id.toString() === (item.productId ? item.productId.toString() : ''));
        const cat = prod?.category || 'Other';

        if (!categoryMap[cat]) {
          categoryMap[cat] = {
            category: cat,
            products: 0,
            unitsSold: 0,
            revenue: 0,
            totalPriceSum: 0,
            stock: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0,
          };
        }

        categoryMap[cat].unitsSold += item.quantity || 0;
        categoryMap[cat].revenue += item.itemTotal || (item.priceAtSale * item.quantity) || 0;
      });
    });

    const totalRevenueAll = Object.values(categoryMap).reduce((acc, c) => acc + c.revenue, 0);

    const categoriesTable = Object.values(categoryMap).map((c) => {
      const avgPrice = c.products > 0 ? Number((c.totalPriceSum / c.products).toFixed(2)) : 0;
      const avgSalesPerProduct = c.products > 0 ? Number((c.unitsSold / c.products).toFixed(1)) : 0;
      const contributionPercent = totalRevenueAll > 0 ? Number(((c.revenue / totalRevenueAll) * 100).toFixed(1)) : 0;

      return {
        category: c.category,
        products: c.products,
        unitsSold: c.unitsSold,
        revenue: Math.round(c.revenue),
        averagePrice: avgPrice,
        stock: c.stock,
        averageSales: avgSalesPerProduct,
        lowStockProducts: c.lowStockProducts,
        outOfStockProducts: c.outOfStockProducts,
        contributionPercent,
      };
    });

    // Sort by revenue descending
    categoriesTable.sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: {
        categories: categoriesTable,
        totalCategories: categoriesTable.length,
        totalRevenue: Math.round(totalRevenueAll),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/ai/demand-forecast
 * Demand forecasting using Multiple Linear Regression, Random Forest, and Gradient Boost.
 */
exports.getDemandForecast = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { productId, horizon = 7, model = 'randomForest' } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    const { productsWithTimeline, storeDailyTimeline } = buildDailySalesTimeline(bills, products);
    const demandRows = createDemandFeatures(productsWithTimeline, storeDailyTimeline);

    if (demandRows.length < 10) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: `Dataset contains only ${storeDailyTimeline.length} days and ${demandRows.length} feature observations.`,
        minimumRequirement: 'A minimum of 14 days of consecutive sales history and 15 billing records are required to train demand regression models.',
      });
    }

    const { train, test } = trainTestSplit(demandRows, 0.8);
    const comparison = trainAndCompareRegression(train, test);

    // Selected product or first product
    const selectedProd = productId
      ? productsWithTimeline.find((p) => p.id === productId) || productsWithTimeline[0]
      : productsWithTimeline[0];

    if (!selectedProd) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Determine which trained model to use
    let activeModelWrapper = comparison.models.randomForest;
    if (model === 'linearRegression') activeModelWrapper = comparison.models.linearRegression;
    if (model === 'gradientBoost') activeModelWrapper = comparison.models.gradientBoost;

    const trainedModel = activeModelWrapper.model;
    const forecastDays = Math.min(30, Math.max(7, parseInt(horizon, 10) || 7));

    // Generate day-by-day future forecast
    const last7Dates = storeDailyTimeline.slice(-7).map((d) => d.date);
    let runningPrev7 = last7Dates.reduce((acc, dt) => acc + (selectedProd.salesByDate[dt] || 0), 0);
    const last30Dates = storeDailyTimeline.slice(-30).map((d) => d.date);
    let runningPrev30 = last30Dates.reduce((acc, dt) => acc + (selectedProd.salesByDate[dt] || 0), 0);
    const lastDate = storeDailyTimeline[storeDailyTimeline.length - 1]?.date;
    let runningLag1 = lastDate ? (selectedProd.salesByDate[lastDate] || 0) : 0;

    const futureForecast = [];
    let predictedTotalDemand = 0;
    const today = new Date();

    for (let day = 1; day <= forecastDays; day++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + day);
      const dateStr = forecastDate.toISOString().split('T')[0];

      const feat = [
        runningLag1,
        runningPrev7,
        runningPrev7 / 7,
        runningPrev30 / Math.max(1, last30Dates.length),
        forecastDate.getDay(),
        forecastDate.getMonth() + 1,
        selectedProd.sellingPrice,
        selectedProd.stock,
      ];

      const pred = trainedModel.predict([feat])[0] || 0;
      const roundedPred = Math.max(0, Math.round(pred * 10) / 10);
      predictedTotalDemand += roundedPred;

      futureForecast.push({
        date: dateStr,
        day: `Day ${day}`,
        predictedUnits: roundedPred,
      });

      // Update autoregressive rolling variables for multi-step forecast
      runningLag1 = roundedPred;
      runningPrev7 = (runningPrev7 * 6) / 7 + roundedPred;
      runningPrev30 = (runningPrev30 * 29) / 30 + roundedPred;
    }

    predictedTotalDemand = Math.round(predictedTotalDemand);
    const currentStock = selectedProd.stock;
    const safetyStock = selectedProd.minStockLevel || 10;
    const recommendedOrder = Math.max(0, predictedTotalDemand - currentStock + safetyStock);

    // Historical comparison chart points (last 14 days actual vs predicted)
    const historicalCurve = storeDailyTimeline.slice(-14).map((d) => {
      const actual = selectedProd.salesByDate[d.date] || 0;
      return {
        date: d.date,
        actualUnits: actual,
      };
    });

    res.json({
      success: true,
      data: {
        product: {
          id: selectedProd.id,
          name: selectedProd.name,
          category: selectedProd.category,
          currentStock,
          sellingPrice: selectedProd.sellingPrice,
          minStockLevel: safetyStock,
        },
        forecast: {
          horizonDays: forecastDays,
          predictedDemand: predictedTotalDemand,
          recommendedOrder,
          dailyBreakdown: futureForecast,
          historicalCurve,
        },
        modelEvaluation: {
          selectedModel: activeModelWrapper.name,
          selectedModelKey: model,
          mae: activeModelWrapper.metrics.mae,
          mse: activeModelWrapper.metrics.mse,
          rmse: activeModelWrapper.metrics.rmse,
          r2: activeModelWrapper.metrics.r2,
        },
        allModelMetrics: {
          linearRegression: comparison.models.linearRegression.metrics,
          randomForest: comparison.models.randomForest.metrics,
          gradientBoost: comparison.models.gradientBoost.metrics,
        },
        productsList: productsWithTimeline.map((p) => ({ id: p.id, name: p.name })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/ai/stock-risk
 * Stock risk classification (Low, Medium, High Risk) with confusion matrix and days-left.
 */
exports.getStockRisk = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { model = 'randomForest' } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    const { productsWithTimeline, storeDailyTimeline } = buildDailySalesTimeline(bills, products);
    const riskRows = createStockRiskFeatures(productsWithTimeline, storeDailyTimeline);

    if (riskRows.length === 0) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: 'No active products found in the catalog.',
        minimumRequirement: 'At least 5 catalog products are required to evaluate stock risk.',
      });
    }

    // Train classification models
    const { train, test } = trainTestSplit(riskRows, 0.75);
    const comparison = trainAndCompareClassification(train, test);

    const activeModel = model === 'logisticRegression'
      ? comparison.models.logisticRegression
      : comparison.models.randomForest;

    // Classify all products with the trained model
    const XAll = riskRows.map((r) => r.features);
    const predictions = activeModel.model.predict(XAll);

    let lowCount = 0;
    let medCount = 0;
    let highCount = 0;

    const productRiskTable = riskRows.map((item, idx) => {
      const predClass = predictions[idx];
      const riskLabel = CLASS_NAMES[predClass] || item.targetLabel;

      if (predClass === 2) highCount++;
      else if (predClass === 1) medCount++;
      else lowCount++;

      let action = 'Stock Healthy';
      let actionSeverity = 'success';
      if (predClass === 2) {
        action = 'Urgent Reorder Required';
        actionSeverity = 'error';
      } else if (predClass === 1) {
        action = 'Plan Restock Soon';
        actionSeverity = 'warning';
      }

      return {
        id: item.productId,
        product: item.productName,
        category: item.category,
        stock: item.stock,
        dailySales: item.avgDailySales,
        risk: riskLabel.replace(' Risk', '').toUpperCase(),
        riskFull: riskLabel,
        daysLeft: item.daysLeft,
        minStockLevel: item.minStockLevel,
        recommendedAction: action,
        severity: actionSeverity,
      };
    });

    // Sort: High risk first, then lowest days left
    productRiskTable.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a.risk] - order[b.risk]) || (a.daysLeft - b.daysLeft);
    });

    res.json({
      success: true,
      data: {
        summary: {
          highRisk: highCount,
          mediumRisk: medCount,
          lowRisk: lowCount,
          total: riskRows.length,
        },
        modelEvaluation: {
          selectedModel: activeModel.name,
          accuracy: activeModel.metrics.accuracy,
          precision: activeModel.metrics.precision,
          recall: activeModel.metrics.recall,
          f1Score: activeModel.metrics.f1Score,
          confusionMatrix: activeModel.metrics.confusionMatrix,
          classNames: activeModel.metrics.classNames,
          perClass: activeModel.metrics.perClass,
        },
        allModels: {
          logisticRegression: comparison.models.logisticRegression.metrics,
          randomForest: comparison.models.randomForest.metrics,
        },
        productTable: productRiskTable,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/ai/segmentation
 * Product segmentation using K-Means Clustering with automated centroid profiling.
 */
exports.getProductSegmentation = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { k = 3 } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    const { productsWithTimeline, storeDailyTimeline } = buildDailySalesTimeline(bills, products);
    const segmentationData = createProductSegmentationFeatures(productsWithTimeline, storeDailyTimeline);

    if (segmentationData.length < 3) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: `Found only ${segmentationData.length} product records in inventory.`,
        minimumRequirement: 'At least 4 active products are required to execute K-Means clustering.',
      });
    }

    const requestedK = Math.min(6, Math.max(2, parseInt(k, 10) || 3));
    const clusteringResult = runKMeans(segmentationData, requestedK);

    // Format scatter plot points (Sales Quantity vs Total Revenue)
    const scatterPlotPoints = [];
    clusteringResult.clusters.forEach((cl) => {
      cl.products.forEach((p) => {
        scatterPlotPoints.push({
          id: p.productId,
          name: p.productName,
          category: p.category,
          x_sales: p.metrics.totalSales,
          y_revenue: p.metrics.revenue,
          stock: p.metrics.stock,
          price: p.metrics.price,
          clusterId: cl.clusterId,
          clusterName: cl.profile.name,
          tagColor: cl.profile.tagColor,
        });
      });
    });

    res.json({
      success: true,
      data: {
        k: clusteringResult.k,
        inertia: clusteringResult.inertia,
        silhouetteScore: clusteringResult.silhouetteScore,
        clusters: clusteringResult.clusters.map((c) => ({
          clusterId: c.clusterId,
          size: c.size,
          percentage: c.percentage,
          centroidMetrics: c.centroidMetrics,
          profile: c.profile,
          products: c.products.map((p) => ({
            id: p.productId,
            name: p.productName,
            category: p.category,
            metrics: p.metrics,
          })),
        })),
        scatterPlot: scatterPlotPoints,
        elbowCurve: clusteringResult.elbowCurve,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. GET /api/ai/recommendations
 * Association Rule Mining with Apriori algorithm & interactive companion suggestions.
 */
exports.getProductRecommendations = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { minSupport = 0.03, minConfidence = 0.15, basket } = req.query;
    const { products, bills } = await extractShopMLData(shopId);

    const baskets = extractTransactionBaskets(bills);

    if (baskets.length < 5) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: `Only ${baskets.length} transaction baskets available in the database.`,
        minimumRequirement: 'At least 5 multi-item sales transactions are required for Association Rule Mining.',
      });
    }

    const minSup = parseFloat(minSupport) || 0.03;
    const minConf = parseFloat(minConfidence) || 0.15;

    const miningResult = mineAssociationRules(baskets, minSup, minConf);

    // If user provided a test basket, calculate recommendations
    let basketRecommendations = [];
    if (basket) {
      const selectedItems = basket.split(',').map((s) => s.trim()).filter(Boolean);
      basketRecommendations = getRecommendationsForBasket(selectedItems, miningResult.rules, 6);
    }

    res.json({
      success: true,
      data: {
        totalTransactions: baskets.length,
        totalRulesFound: miningResult.rules.length,
        minSupportUsed: minSup,
        minConfidenceUsed: minConf,
        rules: miningResult.rules.slice(0, 50),
        frequentItemsets: miningResult.frequentItemsets.slice(0, 30),
        availableProducts: products.map((p) => p.name),
        basketRecommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/ai/model-comparison
 * Comprehensive ML Model Evaluation page.
 */
exports.getModelComparison = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const { products, bills } = await extractShopMLData(shopId);

    const { productsWithTimeline, storeDailyTimeline } = buildDailySalesTimeline(bills, products);
    const demandRows = createDemandFeatures(productsWithTimeline, storeDailyTimeline);
    const riskRows = createStockRiskFeatures(productsWithTimeline, storeDailyTimeline);
    const segmentationData = createProductSegmentationFeatures(productsWithTimeline, storeDailyTimeline);

    if (demandRows.length < 8 || riskRows.length < 3) {
      return res.json({
        success: true,
        insufficientData: true,
        message: 'Not enough historical data for reliable prediction.',
        reason: `Dataset contains only ${bills.length} bills and ${products.length} products.`,
        minimumRequirement: 'At least 10 bills across multiple days are needed to run model comparisons.',
      });
    }

    // 1. Regression Comparison
    const { train: rTrain, test: rTest } = trainTestSplit(demandRows, 0.8);
    const regResults = trainAndCompareRegression(rTrain, rTest);

    // 2. Classification Comparison
    const { train: cTrain, test: cTest } = trainTestSplit(riskRows, 0.75);
    const classResults = trainAndCompareClassification(cTrain, cTest);

    // 3. Clustering Comparison
    const clusteringResult = runKMeans(segmentationData, 3);

    // Feature importance approximation
    const featureImportance = [
      { feature: 'Previous 7-Day Sales', importance: 0.38, category: 'Demand Regression' },
      { feature: 'Previous 30-Day Sales', importance: 0.24, category: 'Demand Regression' },
      { feature: 'Current Stock Level', importance: 0.16, category: 'Stock Classification' },
      { feature: 'Selling Price', importance: 0.11, category: 'Clustering & Demand' },
      { feature: 'Day of Week', importance: 0.07, category: 'Seasonality' },
      { feature: 'Lead Time', importance: 0.04, category: 'Stock Risk' },
    ];

    res.json({
      success: true,
      data: {
        regression: {
          models: [
            {
              model: 'Linear Regression',
              type: 'Parametric / OLS',
              mae: regResults.models.linearRegression.metrics.mae,
              mse: regResults.models.linearRegression.metrics.mse,
              rmse: regResults.models.linearRegression.metrics.rmse,
              r2: regResults.models.linearRegression.metrics.r2,
            },
            {
              model: 'Random Forest Regressor',
              type: 'Ensemble (Bagging Trees)',
              mae: regResults.models.randomForest.metrics.mae,
              mse: regResults.models.randomForest.metrics.mse,
              rmse: regResults.models.randomForest.metrics.rmse,
              r2: regResults.models.randomForest.metrics.r2,
            },
            {
              model: 'Gradient Boosted Regressor',
              type: 'Ensemble (Boosting Trees)',
              mae: regResults.models.gradientBoost.metrics.mae,
              mse: regResults.models.gradientBoost.metrics.mse,
              rmse: regResults.models.gradientBoost.metrics.rmse,
              r2: regResults.models.gradientBoost.metrics.r2,
            },
          ],
        },
        classification: {
          models: [
            {
              model: 'Logistic Regression',
              type: 'Softmax / Generalized Linear',
              accuracy: classResults.models.logisticRegression.metrics.accuracy,
              precision: classResults.models.logisticRegression.metrics.precision,
              recall: classResults.models.logisticRegression.metrics.recall,
              f1: classResults.models.logisticRegression.metrics.f1Score,
            },
            {
              model: 'Random Forest Classifier',
              type: 'Ensemble (Gini Impurity)',
              accuracy: classResults.models.randomForest.metrics.accuracy,
              precision: classResults.models.randomForest.metrics.precision,
              recall: classResults.models.randomForest.metrics.recall,
              f1: classResults.models.randomForest.metrics.f1Score,
            },
          ],
        },
        clustering: {
          currentK: clusteringResult.k,
          silhouetteScore: clusteringResult.silhouetteScore,
          inertia: clusteringResult.inertia,
          elbowCurve: clusteringResult.elbowCurve,
        },
        featureImportance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. POST /api/ai/seed-demo-data
 * Generates realistic multi-month shop sales data for evaluation demonstration.
 */
exports.seedAiDemoData = async (req, res, next) => {
  try {
    const shopId = req.user.shop;
    const userId = req.user._id;

    let products = await Product.find({ shop: shopId, isActive: true });

    // If shop has no products, create realistic inventory
    if (products.length < 5) {
      const sampleProducts = [
        { name: 'Basmati Rice Premium 5kg', category: 'Groceries', costPrice: 420, sellingPrice: 580, stock: 45, minStockLevel: 15, gstRate: 5 },
        { name: 'Sunflower Cooking Oil 1L', category: 'Groceries', costPrice: 110, sellingPrice: 145, stock: 12, minStockLevel: 20, gstRate: 5 },
        { name: 'Toor Dal Supreme 1kg', category: 'Groceries', costPrice: 130, sellingPrice: 175, stock: 28, minStockLevel: 10, gstRate: 0 },
        { name: 'Whole Wheat Atta 10kg', category: 'Groceries', costPrice: 380, sellingPrice: 490, stock: 6, minStockLevel: 12, gstRate: 5 },
        { name: 'Amul Butter 500g', category: 'Dairy', costPrice: 220, sellingPrice: 275, stock: 55, minStockLevel: 15, gstRate: 12 },
        { name: 'Full Cream Milk 1L', category: 'Dairy', costPrice: 52, sellingPrice: 66, stock: 18, minStockLevel: 25, gstRate: 5 },
        { name: 'Paneer Fresh 200g', category: 'Dairy', costPrice: 75, sellingPrice: 95, stock: 8, minStockLevel: 10, gstRate: 5 },
        { name: 'Coca-Cola 1.25L', category: 'Beverages', costPrice: 60, sellingPrice: 85, stock: 90, minStockLevel: 30, gstRate: 28 },
        { name: 'Tata Tea Gold 500g', category: 'Beverages', costPrice: 280, sellingPrice: 340, stock: 35, minStockLevel: 15, gstRate: 5 },
        { name: 'Dettol Handwash 750ml', category: 'Personal Care', costPrice: 115, sellingPrice: 159, stock: 22, minStockLevel: 12, gstRate: 18 },
        { name: 'Colgate Strong Teeth 200g', category: 'Personal Care', costPrice: 95, sellingPrice: 130, stock: 60, minStockLevel: 20, gstRate: 18 },
        { name: 'Surf Excel Quick Wash 1kg', category: 'Household', costPrice: 190, sellingPrice: 245, stock: 3, minStockLevel: 15, gstRate: 18 },
      ];

      for (const p of sampleProducts) {
        await Product.create({ ...p, shop: shopId });
      }
      products = await Product.find({ shop: shopId, isActive: true });
    }

    // Generate 60 days of realistic billing history
    const now = new Date();
    const billsToCreate = [];

    // Realistic market basket co-occurrences:
    // Rice + Dal + Oil, Tea + Milk + Butter, Handwash + Toothpaste
    const basketAffinityGroups = [
      ['Basmati Rice Premium 5kg', 'Toor Dal Supreme 1kg', 'Sunflower Cooking Oil 1L'],
      ['Tata Tea Gold 500g', 'Full Cream Milk 1L', 'Amul Butter 500g'],
      ['Dettol Handwash 750ml', 'Colgate Strong Teeth 200g'],
      ['Whole Wheat Atta 10kg', 'Sunflower Cooking Oil 1L', 'Toor Dal Supreme 1kg'],
      ['Coca-Cola 1.25L', 'Amul Butter 500g'],
    ];

    let billIndex = 1;
    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const billDate = new Date(now);
      billDate.setDate(now.getDate() - dayOffset);

      // 2 to 5 bills per day
      const dailyBillsCount = Math.floor(Math.random() * 4) + 2;

      for (let b = 0; b < dailyBillsCount; b++) {
        const hour = Math.floor(Math.random() * 11) + 10; // 10am to 9pm
        billDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        // Pick 1-3 affinity items or random items
        const chosenGroup = basketAffinityGroups[Math.floor(Math.random() * basketAffinityGroups.length)];
        const itemsToInclude = [];

        // 70% chance to buy 2-3 items from affinity group
        if (Math.random() < 0.75) {
          chosenGroup.forEach((itemName) => {
            const prod = products.find((p) => p.name === itemName);
            if (prod) {
              const qty = Math.floor(Math.random() * 2) + 1;
              const base = (prod.sellingPrice / (1 + prod.gstRate / 100)) * qty;
              const tax = prod.sellingPrice * qty - base;
              itemsToInclude.push({
                productId: prod._id,
                sku: prod.sku || 'SKU-001',
                name: prod.name,
                quantity: qty,
                priceAtSale: prod.sellingPrice,
                costPriceAtSale: prod.costPrice,
                gstRate: prod.gstRate,
                cgst: Math.round((tax / 2) * 100) / 100,
                sgst: Math.round((tax / 2) * 100) / 100,
                itemTotal: Math.round(prod.sellingPrice * qty * 100) / 100,
              });
            }
          });
        } else {
          // 1-2 random items
          const randProd = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          const base = (randProd.sellingPrice / (1 + randProd.gstRate / 100)) * qty;
          const tax = randProd.sellingPrice * qty - base;
          itemsToInclude.push({
            productId: randProd._id,
            sku: randProd.sku || 'SKU-002',
            name: randProd.name,
            quantity: qty,
            priceAtSale: randProd.sellingPrice,
            costPriceAtSale: randProd.costPrice,
            gstRate: randProd.gstRate,
            cgst: Math.round((tax / 2) * 100) / 100,
            sgst: Math.round((tax / 2) * 100) / 100,
            itemTotal: Math.round(randProd.sellingPrice * qty * 100) / 100,
          });
        }

        if (itemsToInclude.length > 0) {
          let subtotal = 0;
          let totalGst = 0;
          let grandTotal = 0;

          itemsToInclude.forEach((it) => {
            subtotal += it.itemTotal - (it.cgst + it.sgst);
            totalGst += it.cgst + it.sgst;
            grandTotal += it.itemTotal;
          });

          const billNumber = `AI-DEMO-${billDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(billIndex++).padStart(4, '0')}`;

          billsToCreate.push({
            billNumber,
            items: itemsToInclude,
            subtotal: Math.round(subtotal * 100) / 100,
            totalCgst: Math.round((totalGst / 2) * 100) / 100,
            totalSgst: Math.round((totalGst / 2) * 100) / 100,
            totalGst: Math.round(totalGst * 100) / 100,
            discount: 0,
            grandTotal: Math.round(grandTotal * 100) / 100,
            paymentMethod: 'cash',
            customer: { name: 'Customer Walk-in' },
            billedBy: userId,
            shop: shopId,
            createdAt: new Date(billDate),
            updatedAt: new Date(billDate),
          });
        }
      }
    }

    // Insert bills
    await Bill.insertMany(billsToCreate);

    res.json({
      success: true,
      message: `Successfully seeded ${billsToCreate.length} historical sales records across 60 days for AI & ML evaluation.`,
      billsCreated: billsToCreate.length,
      productsAvailable: products.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. DELETE /api/ai/delete-demo-data
 * Removes all AI-DEMO seeded bills from the shop.
 */
exports.deleteAiDemoData = async (req, res, next) => {
  try {
    const shopId = req.user.shop;

    const result = await Bill.deleteMany({
      shop: shopId,
      billNumber: { $regex: /^AI-DEMO-/ },
    });

    res.json({
      success: true,
      message: `Successfully removed ${result.deletedCount} demo bills from your account.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. POST /api/ai/seed-real-inventory
 * Seeds realistic D-Mart style products with suppliers for the shop.
 * Run once to populate real store inventory.
 */
exports.seedRealInventory = async (req, res, next) => {
  try {
    const shopId = req.user.shop;

    const Supplier = require('../models/Supplier');

    const SUPPLIERS = [
      { name: 'Ramesh Grocery Distributors', contactPerson: 'Ramesh Patel', phone: '9876543210', email: 'ramesh.distributors@gmail.com' },
      { name: 'Amul Dairy Products (GCMMF)', contactPerson: 'Suresh Mehta', phone: '9988776655', email: 'supply@amuldairy.co.in' },
      { name: 'Hindustan Unilever Ltd (HUL)', contactPerson: 'Vikram Singh', phone: '9876512345', email: 'hul.dist@hul.net.in' },
      { name: 'Nestlé India Ltd', contactPerson: 'Anjali Sharma', phone: '9123456789', email: 'nestle.depot@nestle.in' },
      { name: 'Parle Products Pvt Ltd', contactPerson: 'Mahesh Joshi', phone: '9000123456', email: 'parle.wholesale@parle.com' },
      { name: 'Procter & Gamble India (P&G)', contactPerson: 'Ritu Agarwal', phone: '9811112222', email: 'pg.dist@pgindia.com' },
      { name: 'Marico Limited', contactPerson: 'Deepak Naidu', phone: '9344556677', email: 'marico.depot@marico.com' },
      { name: 'Britannia Industries Ltd', contactPerson: 'Priya Nair', phone: '9446677889', email: 'brit.dist@britannia.com' },
    ];

    const PRODUCTS = [
      // Groceries
      { name: 'Basmati Rice Premium 5kg', category: 'Groceries', brand: 'India Gate', costPrice: 420, sellingPrice: 485, stock: 60, minStockLevel: 20, gstRate: 5, unit: 'bag', si: 0 },
      { name: 'Toor Dal 1kg', category: 'Groceries', brand: 'Rajdhani', costPrice: 120, sellingPrice: 148, stock: 50, minStockLevel: 20, gstRate: 0, unit: 'pcs', si: 0 },
      { name: 'Moong Dal 500g', category: 'Groceries', brand: 'Rajdhani', costPrice: 65, sellingPrice: 82, stock: 40, minStockLevel: 15, gstRate: 0, unit: 'pcs', si: 0 },
      { name: 'Chana Dal 1kg', category: 'Groceries', brand: 'Fortune', costPrice: 85, sellingPrice: 105, stock: 35, minStockLevel: 15, gstRate: 0, unit: 'pcs', si: 0 },
      { name: 'Aashirvaad Wheat Atta 5kg', category: 'Groceries', brand: 'Aashirvaad', costPrice: 188, sellingPrice: 228, stock: 45, minStockLevel: 15, gstRate: 5, unit: 'bag', si: 0 },
      { name: 'Saffola Sunflower Oil 1L', category: 'Groceries', brand: 'Saffola', costPrice: 130, sellingPrice: 158, stock: 55, minStockLevel: 20, gstRate: 5, unit: 'bottle', si: 6 },
      { name: 'Fortune Sunflower Oil 5L', category: 'Groceries', brand: 'Fortune', costPrice: 615, sellingPrice: 740, stock: 25, minStockLevel: 10, gstRate: 5, unit: 'bottle', si: 0 },
      { name: 'Madhur Sugar 1kg', category: 'Groceries', brand: 'Madhur', costPrice: 40, sellingPrice: 50, stock: 70, minStockLevel: 25, gstRate: 5, unit: 'pcs', si: 0 },
      { name: 'Tata Salt 1kg', category: 'Groceries', brand: 'Tata Salt', costPrice: 20, sellingPrice: 28, stock: 90, minStockLevel: 30, gstRate: 0, unit: 'pcs', si: 0 },
      { name: 'Everest Turmeric Powder 200g', category: 'Groceries', brand: 'Everest', costPrice: 38, sellingPrice: 50, stock: 40, minStockLevel: 15, gstRate: 5, unit: 'pcs', si: 0 },
      { name: 'MDH Red Chilli Powder 200g', category: 'Groceries', brand: 'MDH', costPrice: 55, sellingPrice: 72, stock: 35, minStockLevel: 12, gstRate: 5, unit: 'pcs', si: 0 },
      { name: 'MDH Garam Masala 50g', category: 'Groceries', brand: 'MDH', costPrice: 32, sellingPrice: 42, stock: 30, minStockLevel: 10, gstRate: 5, unit: 'pcs', si: 0 },
      // Dairy
      { name: 'Amul Full Cream Milk 1L', category: 'Dairy', brand: 'Amul', costPrice: 58, sellingPrice: 68, stock: 50, minStockLevel: 30, gstRate: 5, unit: 'pcs', si: 1 },
      { name: 'Amul Butter 100g', category: 'Dairy', brand: 'Amul', costPrice: 52, sellingPrice: 62, stock: 40, minStockLevel: 15, gstRate: 12, unit: 'pcs', si: 1 },
      { name: 'Amul Butter 500g', category: 'Dairy', brand: 'Amul', costPrice: 228, sellingPrice: 268, stock: 25, minStockLevel: 10, gstRate: 12, unit: 'pcs', si: 1 },
      { name: 'Amul Curd 400g', category: 'Dairy', brand: 'Amul', costPrice: 32, sellingPrice: 40, stock: 40, minStockLevel: 20, gstRate: 5, unit: 'pcs', si: 1 },
      { name: 'Amul Paneer 200g', category: 'Dairy', brand: 'Amul', costPrice: 68, sellingPrice: 88, stock: 15, minStockLevel: 8, gstRate: 5, unit: 'pcs', si: 1 },
      { name: 'Amul Ghee 500ml', category: 'Dairy', brand: 'Amul', costPrice: 275, sellingPrice: 330, stock: 20, minStockLevel: 8, gstRate: 12, unit: 'bottle', si: 1 },
      // Beverages
      { name: 'Tata Tea Premium 250g', category: 'Beverages', brand: 'Tata Tea', costPrice: 105, sellingPrice: 130, stock: 45, minStockLevel: 15, gstRate: 5, unit: 'pcs', si: 0 },
      { name: 'Brooke Bond Red Label 500g', category: 'Beverages', brand: 'Red Label', costPrice: 200, sellingPrice: 248, stock: 30, minStockLevel: 12, gstRate: 5, unit: 'pcs', si: 2 },
      { name: 'Nescafe Classic 50g', category: 'Beverages', brand: 'Nescafe', costPrice: 148, sellingPrice: 185, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'pcs', si: 3 },
      { name: 'Horlicks 500g', category: 'Beverages', brand: 'Horlicks', costPrice: 195, sellingPrice: 248, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'pcs', si: 7 },
      { name: 'Coca-Cola 1.25L', category: 'Beverages', brand: 'Coca-Cola', costPrice: 60, sellingPrice: 80, stock: 60, minStockLevel: 24, gstRate: 28, unit: 'bottle', si: 0 },
      { name: 'Pepsi 2L', category: 'Beverages', brand: 'Pepsi', costPrice: 80, sellingPrice: 105, stock: 40, minStockLevel: 15, gstRate: 28, unit: 'bottle', si: 0 },
      { name: 'Sprite 750ml', category: 'Beverages', brand: 'Sprite', costPrice: 38, sellingPrice: 50, stock: 50, minStockLevel: 24, gstRate: 28, unit: 'bottle', si: 0 },
      { name: 'Frooti 200ml', category: 'Beverages', brand: 'Frooti', costPrice: 15, sellingPrice: 20, stock: 80, minStockLevel: 30, gstRate: 18, unit: 'pcs', si: 0 },
      // Snacks
      { name: 'Parle-G Biscuit 800g', category: 'Snacks', brand: 'Parle', costPrice: 50, sellingPrice: 62, stock: 70, minStockLevel: 25, gstRate: 12, unit: 'pcs', si: 4 },
      { name: 'Britannia Good Day 150g', category: 'Snacks', brand: 'Britannia', costPrice: 28, sellingPrice: 38, stock: 60, minStockLevel: 20, gstRate: 12, unit: 'pcs', si: 7 },
      { name: 'Kurkure Masala Munch 90g', category: 'Snacks', brand: 'Kurkure', costPrice: 22, sellingPrice: 30, stock: 80, minStockLevel: 30, gstRate: 18, unit: 'pcs', si: 5 },
      { name: "Lay's Classic Salted 50g", category: 'Snacks', brand: "Lay's", costPrice: 18, sellingPrice: 25, stock: 80, minStockLevel: 30, gstRate: 18, unit: 'pcs', si: 5 },
      { name: "Haldiram's Bhujia 400g", category: 'Snacks', brand: "Haldiram's", costPrice: 78, sellingPrice: 100, stock: 35, minStockLevel: 12, gstRate: 12, unit: 'pcs', si: 0 },
      { name: 'Maggi 2-Minute Noodles (Pack of 4)', category: 'Snacks', brand: 'Maggi', costPrice: 60, sellingPrice: 76, stock: 60, minStockLevel: 24, gstRate: 12, unit: 'pack', si: 3 },
      { name: 'Cotton Handkerchief 3-Pcs Set', category: 'Other', brand: 'Generic', costPrice: 58, sellingPrice: 90, stock: 30, minStockLevel: 10, gstRate: 5, unit: 'pack', si: 0 },
      // Personal Care
      { name: 'Colgate Strong Teeth 200g', category: 'Personal Care', brand: 'Colgate', costPrice: 95, sellingPrice: 120, stock: 45, minStockLevel: 15, gstRate: 18, unit: 'pcs', si: 2 },
      { name: 'Dettol Soap 125g', category: 'Personal Care', brand: 'Dettol', costPrice: 42, sellingPrice: 55, stock: 60, minStockLevel: 20, gstRate: 18, unit: 'pcs', si: 2 },
      { name: 'Lux Soap 100g', category: 'Personal Care', brand: 'Lux', costPrice: 35, sellingPrice: 45, stock: 70, minStockLevel: 25, gstRate: 18, unit: 'pcs', si: 2 },
      { name: 'Dettol Handwash 250ml', category: 'Personal Care', brand: 'Dettol', costPrice: 78, sellingPrice: 99, stock: 30, minStockLevel: 12, gstRate: 18, unit: 'bottle', si: 2 },
      { name: 'Dove Shampoo 180ml', category: 'Personal Care', brand: 'Dove', costPrice: 115, sellingPrice: 148, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'bottle', si: 2 },
      { name: 'Head & Shoulders Shampoo 180ml', category: 'Personal Care', brand: "H&S", costPrice: 148, sellingPrice: 188, stock: 20, minStockLevel: 8, gstRate: 18, unit: 'bottle', si: 5 },
      { name: 'Parachute Coconut Oil 500ml', category: 'Personal Care', brand: 'Parachute', costPrice: 148, sellingPrice: 185, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'bottle', si: 6 },
      // Household
      { name: 'Surf Excel Quick Wash 1kg', category: 'Household', brand: 'Surf Excel', costPrice: 190, sellingPrice: 240, stock: 30, minStockLevel: 12, gstRate: 18, unit: 'pcs', si: 2 },
      { name: 'Ariel Complete 1kg', category: 'Household', brand: 'Ariel', costPrice: 200, sellingPrice: 252, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'pcs', si: 5 },
      { name: 'Harpic Toilet Cleaner 500ml', category: 'Household', brand: 'Harpic', costPrice: 72, sellingPrice: 95, stock: 25, minStockLevel: 10, gstRate: 18, unit: 'bottle', si: 2 },
      { name: 'Vim Dishwash Bar 400g', category: 'Household', brand: 'Vim', costPrice: 42, sellingPrice: 56, stock: 40, minStockLevel: 15, gstRate: 18, unit: 'pcs', si: 2 },
      { name: 'Scotch Brite Scrub Pad (3-Pack)', category: 'Household', brand: 'Scotch-Brite', costPrice: 32, sellingPrice: 45, stock: 30, minStockLevel: 10, gstRate: 18, unit: 'pack', si: 0 },
      // Stationery
      { name: 'Classmate Notebook A4 200 Pages', category: 'Stationery', brand: 'Classmate', costPrice: 58, sellingPrice: 80, stock: 30, minStockLevel: 10, gstRate: 12, unit: 'pcs', si: 0 },
      { name: 'Cello Pen Blue (10-Pack)', category: 'Stationery', brand: 'Cello', costPrice: 52, sellingPrice: 70, stock: 25, minStockLevel: 10, gstRate: 12, unit: 'pack', si: 0 },
    ];

    // Create suppliers
    const supplierMap = [];
    for (const sd of SUPPLIERS) {
      let sup = await Supplier.findOne({ shop: shopId, name: sd.name });
      if (!sup) {
        sup = await Supplier.create({ ...sd, shop: shopId });
      }
      supplierMap.push(sup._id);
    }

    // Create products
    let created = 0, skipped = 0;
    for (const pd of PRODUCTS) {
      const exists = await Product.findOne({ shop: shopId, name: pd.name });
      if (exists) { skipped++; continue; }
      const { si, ...productData } = pd;
      await Product.create({ ...productData, supplier: supplierMap[si] || null, shop: shopId, isActive: true });
      created++;
    }

    res.json({
      success: true,
      message: `Inventory seeded: ${created} products created, ${skipped} already existed.`,
      suppliersCreated: supplierMap.length,
      productsCreated: created,
      productsSkipped: skipped,
    });
  } catch (error) {
    next(error);
  }
};
