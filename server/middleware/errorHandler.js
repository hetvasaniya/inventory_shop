/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
    errors = validationErrors;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'unknown';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    message = `Duplicate value for ${field} (value: "${value}"). This ${field} already exists.`;
    console.error('Duplicate key details:', { field, value, keyValue: err.keyValue, keyPattern: err.keyPattern });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
