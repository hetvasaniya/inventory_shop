/**
 * Global error handler middleware
 * Returns structured, field-level error responses for all error types.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR HANDLER]', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  let statusCode = err.statusCode || 500;
  let responseBody = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // ── Mongoose ValidationError ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const fieldErrors = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: e.message,
      receivedValue: e.value ?? null,
    }));

    // Identify the failing step from field names
    const shopFields = ['shopName', 'gstin', 'phone', 'email', 'address', 'gstState', 'currency'];
    const step = fieldErrors.some((e) => shopFields.includes(e.field))
      ? 'Shop Validation'
      : 'User Validation';

    responseBody = {
      success: false,
      step,
      message: 'Validation failed. Please fix the errors below.',
      errors: fieldErrors,
      // Provide the first error's details at the top level for easy consumption
      field: fieldErrors[0]?.field,
      receivedValue: fieldErrors[0]?.receivedValue,
      expectedFormat: fieldErrors[0]?.field === 'gstin' ? '22AAAAA0000A1Z5' : undefined,
    };
  }

  // ── Mongoose duplicate key ────────────────────────────────────────────────
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'unknown';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    responseBody = {
      success: false,
      step: 'Database Write',
      field,
      message: `A record with this ${field} already exists.`,
      receivedValue: value,
    };
    console.error('[DUPLICATE KEY]', { field, value });
  }

  // ── Mongoose bad ObjectId ─────────────────────────────────────────────────
  else if (err.name === 'CastError') {
    statusCode = 400;
    responseBody = {
      success: false,
      message: `Invalid ${err.path}: "${err.value}"`,
    };
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    responseBody = { success: false, message: 'Invalid token.' };
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    responseBody = { success: false, message: 'Token expired.' };
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
