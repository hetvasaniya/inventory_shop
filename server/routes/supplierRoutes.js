const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router
  .route('/')
  .get(supplierController.getSuppliers)
  .post(supplierController.createSupplier);

router
  .route('/:id')
  .get(supplierController.getSupplier)
  .put(supplierController.updateSupplier)
  .delete(supplierController.deleteSupplier);

module.exports = router;
