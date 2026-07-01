const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
} = require('../middleware/validate');

// =====================
// Public Routes
// =====================

router.post(
  '/register',
  validateRegister,
  authController.registerShopAndOwner
);

router.post(
  '/login',
  validateLogin,
  authController.login
);

router.post(
  '/refresh',
  authController.refreshAccessToken
);

// =====================
// Protected Routes
// =====================

router.get(
  '/me',
  protect,
  authController.getMe
);

router.post(
  '/logout',
  protect,
  authController.logout
);

module.exports = router;