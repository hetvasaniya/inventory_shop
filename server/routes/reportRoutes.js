const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router.get('/dashboard', reportController.getDashboard);
router.get('/daily', reportController.getDailyReport);
router.get('/sales', reportController.getSalesAnalytics);
router.get('/profit', reportController.getProfitLoss);
router.get('/gst', reportController.getGSTReport);

module.exports = router;
