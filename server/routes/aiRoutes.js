const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// Protect all AI analytics routes — accessible to owner and manager
router.use(protect);
router.use(authorize('owner', 'manager'));

// 1. Central AI Dashboard
router.get('/dashboard', aiController.getAiDashboard);

// 2. Numerical Statistical Analysis
router.get('/numerical-analysis', aiController.getNumericalAnalysis);

// 3. Category Analysis
router.get('/category-analysis', aiController.getCategoryAnalysis);

// 4. Demand Forecasting (Regression)
router.get('/demand-forecast', aiController.getDemandForecast);

// 5. Stock Risk Prediction (Classification)
router.get('/stock-risk', aiController.getStockRisk);

// 6. Product Segmentation (K-Means Clustering)
router.get('/segmentation', aiController.getProductSegmentation);

// 7. Product Recommendations (Apriori Association Rules)
router.get('/recommendations', aiController.getProductRecommendations);

// 8. ML Model Comparison & Evaluation
router.get('/model-comparison', aiController.getModelComparison);

// 9. Delete AI-Demo bills (owner only)
router.delete('/delete-demo-data', authorize('owner'), aiController.deleteAiDemoData);

// 10. Seed real D-Mart style inventory (owner only, one-time use)
router.post('/seed-real-inventory', authorize('owner'), aiController.seedRealInventory);

module.exports = router;
