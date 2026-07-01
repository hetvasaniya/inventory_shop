const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/validate', couponController.validateCoupon);

router.use(authorize('owner'));

router
  .route('/')
  .get(couponController.getCoupons)
  .post(couponController.createCoupon);

router
  .route('/:id')
  .get(couponController.getCoupon)
  .put(couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

module.exports = router;
