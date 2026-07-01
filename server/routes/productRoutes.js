const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(productController.getProducts)
  .post(authorizeRoles('owner'), productController.createProduct);

router.get('/categories/list', productController.getCategories);
router.get('/expiring/soon', productController.getExpiringProducts);
router.get('/low-stock/list', productController.getLowStockProducts);
router.get('/barcode/:barcode', productController.getProductByBarcode);

router
  .route('/:id')
  .get(productController.getProduct)
  .put(authorizeRoles('owner'), productController.updateProduct)
  .delete(authorizeRoles('owner'), productController.deleteProduct);

module.exports = router;
