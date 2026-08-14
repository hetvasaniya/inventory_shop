const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyCode,
  validateResetPassword,
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
  '/forgot-password',
  validateForgotPassword,
  authController.forgotPassword
);

router.post(
  '/verify-code',
  validateVerifyCode,
  authController.verifyResetCode
);

router.post(
  '/reset-password',
  validateResetPassword,
  authController.resetPassword
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