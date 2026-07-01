const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/product/:id', barcodeController.getProductBarcode);
router.get('/product/:id/base64', barcodeController.getProductBarcodeBase64);

router.use(authorize('owner'));
router.post('/generate-stickers', barcodeController.generateStickers);

module.exports = router;
