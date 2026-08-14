const { body, validationResult } = require('express-validator');

// GSTIN regex — optional field, validate only when provided
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Middleware to format express-validator errors into a consistent shape.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
      receivedValue: e.value,
    }));
    return res.status(400).json({
      success: false,
      step: 'Request Validation',
      message: 'Validation failed. Please fix the errors below.',
      errors: formatted,
    });
  }
  next();
};

const validateRegister = [
  body('shopName').notEmpty().withMessage('Shop name is required'),
  body('name').notEmpty().withMessage('Owner name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  // gstin is optional — only validate format when provided
  body('gstin')
    .optional({ checkFalsy: true })
    .customSanitizer((v) => (v ? v.trim().toUpperCase() : ''))
    .custom((value) => {
      if (!value) return true; // empty → skip
      if (!GSTIN_REGEX.test(value)) {
        throw new Error(
          `GSTIN must be exactly 15 alphanumeric characters in format 22AAAAA0000A1Z5. Received: "${value}"`
        );
      }
      return true;
    }),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('A valid email address is required'),
  handleValidationErrors,
];

const validateVerifyCode = [
  body('email').isEmail().withMessage('A valid email address is required'),
  body('code')
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
  handleValidationErrors,
];

const validateResetPassword = [
  body('email').isEmail().withMessage('A valid email address is required'),
  body('code')
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password and confirm password do not match');
      }
      return true;
    }),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyCode,
  validateResetPassword,
};