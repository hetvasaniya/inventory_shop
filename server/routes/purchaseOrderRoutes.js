const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router
  .route('/')
  .get(purchaseOrderController.getPurchaseOrders)
  .post(purchaseOrderController.createPurchaseOrder);

router.post('/bulk', purchaseOrderController.createBulkPurchaseOrders);

router.get(
  '/supplier/:supplierId/analysis',
  purchaseOrderController.getSupplierStockAnalysis
);

router.get(
  '/supplier/:supplierId/history',
  purchaseOrderController.getSupplierPurchaseHistory
);

router
  .route('/:id')
  .get(purchaseOrderController.getPurchaseOrder)
  .put(purchaseOrderController.updatePurchaseOrder)
  .delete(purchaseOrderController.cancelPurchaseOrder);

router.get('/:id/pdf', purchaseOrderController.getPurchaseOrderPDF);
router.post('/:id/receive', purchaseOrderController.receivePurchaseOrder);
router.post('/:id/cancel', purchaseOrderController.cancelPurchaseOrder);

module.exports = router;
