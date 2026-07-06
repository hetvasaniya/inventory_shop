const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Shop = require('../models/Shop');

// GSTIN regex — same as Shop model, centralised here for pre-flight validation
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Generate JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, shop: user.shop },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// ─── Helpers for manual cleanup (used instead of MongoDB transactions) ───────

/**
 * Attempt to delete a User document by _id, ignoring errors.
 * Used as a compensating action when Shop creation fails after User is saved.
 */
const rollbackUser = async (userId) => {
  try {
    await User.deleteOne({ _id: userId });
    console.log('[REGISTER] Rollback — User deleted:', userId);
  } catch (err) {
    // Log but do not rethrow — this is best-effort cleanup
    console.error('[REGISTER] Rollback — Failed to delete User:', userId, err.message);
  }
};

/**
 * Attempt to delete a Shop document by _id, ignoring errors.
 * Used as a compensating action when final user.save() fails after Shop is saved.
 */
const rollbackShop = async (shopId) => {
  try {
    await Shop.deleteOne({ _id: shopId });
    console.log('[REGISTER] Rollback — Shop deleted:', shopId);
  } catch (err) {
    console.error('[REGISTER] Rollback — Failed to delete Shop:', shopId, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new shop + owner account.
 * Body: { shopName, gstin?, address?, phone?, shopEmail?, name, email, password }
 *
 * WHY NO MONGODB TRANSACTION:
 * MongoDB multi-document transactions require a replica set or mongos (sharded cluster).
 * A standalone local mongod (the default dev setup) does not support them and throws:
 *   "Transaction numbers are only allowed on a replica set member or mongos"
 *
 * Instead we use a sequential-write + manual-rollback (compensating transaction) pattern:
 *   Step 1 — Validate all input fields (no DB writes)
 *   Step 2 — Duplicate checks (reads only)
 *   Step 3 — Save User
 *   Step 4 — Save Shop  → if this fails, delete the User saved in Step 3
 *   Step 5 — Update User.shop  → if this fails, delete both User and Shop
 *   Step 6 — Commit: return 201
 *
 * This gives "best-effort atomicity" without requiring a replica set.
 * It is the correct approach for development with a standalone MongoDB.
 *
 * For true ACID atomicity in production, configure MongoDB as a replica set
 * (see docker-compose.yml for the ready-made replica set configuration).
 */
const registerShopAndOwner = async (req, res, next) => {
  // ─── Step 1: Log incoming request ────────────────────────────────────────
  console.log('──────────────────────────────────────────────');
  console.log('[REGISTER] Incoming Request:', {
    body: { ...req.body, password: '[REDACTED]' },
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  const { shopName, gstin, address, phone, shopEmail, name, email, password } = req.body;

  // ─── Step 2: Pre-flight / manual validation (before any DB write) ─────────
  const validationErrors = [];

  if (!shopName || shopName.trim() === '') {
    validationErrors.push({ field: 'shopName', message: 'Shop name is required.' });
  }

  if (!name || name.trim() === '') {
    validationErrors.push({ field: 'name', message: 'Owner name is required.' });
  }

  if (!email || email.trim() === '') {
    validationErrors.push({ field: 'email', message: 'Email is required.' });
  }

  if (!password || password.length < 6) {
    validationErrors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  // Only validate GSTIN format when a value is actually provided (field is optional)
  const normalizedGstin = gstin ? gstin.trim().toUpperCase() : '';
  if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
    validationErrors.push({
      field: 'gstin',
      message: 'GSTIN must be exactly 15 alphanumeric characters.',
      receivedValue: normalizedGstin,
      expectedFormat: '22AAAAA0000A1Z5',
    });
  }

  if (validationErrors.length > 0) {
    console.log('[REGISTER] Validation Errors:', validationErrors);
    return res.status(400).json({
      success: false,
      step: 'Pre-flight Validation',
      message: 'Validation failed. Please fix the errors below.',
      errors: validationErrors,
    });
  }

  console.log('[REGISTER] Validated Data OK:', { shopName, gstin: normalizedGstin, name, email });

  // ─── Step 3: Duplicate checks (reads — no DB writes yet) ─────────────────
  try {
    if (normalizedGstin) {
      const existingShop = await Shop.findOne({ gstin: normalizedGstin });
      if (existingShop) {
        return res.status(409).json({
          success: false,
          step: 'Duplicate Check',
          field: 'gstin',
          message: 'A shop with this GSTIN is already registered.',
          receivedValue: normalizedGstin,
        });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        step: 'Duplicate Check',
        field: 'email',
        message: 'An account with this email already exists.',
      });
    }
  } catch (err) {
    console.error('[REGISTER] Duplicate check failed:', err.message);
    return next(err);
  }

  // ─── Step 4: Save User ────────────────────────────────────────────────────
  // We save the User first with a temporary shop ObjectId placeholder.
  // The real shop._id is linked in Step 6 after Shop is created.
  // The User.shop field has required:true, so we must supply a valid ObjectId now
  // and update it immediately after the shop is persisted.
  let user = null;
  let shop = null;

  try {
    console.log('[REGISTER] User Save Started');
    user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // pre-save hook hashes this
      role: 'owner',
      // Provide a temporary placeholder ObjectId so the required validator passes.
      // It will be replaced with the real shop._id in Step 6.
      shop: new mongoose.Types.ObjectId(),
    });
    console.log('[REGISTER] User Saved:', user._id);
  } catch (err) {
    console.error('[REGISTER] User Save Failed:', err.message);

    if (err.name === 'ValidationError') {
      const fieldErrors = Object.entries(err.errors).map(([field, e]) => ({
        field,
        message: e.message,
        receivedValue: e.value ?? null,
      }));
      return res.status(400).json({
        success: false,
        step: 'User Validation',
        message: 'Validation failed. Please fix the errors below.',
        errors: fieldErrors,
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'unknown';
      return res.status(409).json({
        success: false,
        step: 'User Save',
        field,
        message: `A record with this ${field} already exists.`,
        receivedValue: err.keyValue?.[field],
      });
    }

    return next(err);
  }

  // ─── Step 5: Save Shop ────────────────────────────────────────────────────
  // If Shop creation fails for any reason, we delete the User we just saved
  // (compensating rollback) so no orphan User document is left in the DB.
  try {
    console.log('[REGISTER] Shop Save Started');
    shop = await Shop.create({
      shopName: shopName.trim(),
      gstin: normalizedGstin,           // empty string if not provided — schema allows it
      address: typeof address === 'string' ? { street: address } : address || {},
      phone: phone ? phone.trim() : '',
      email: shopEmail ? shopEmail.trim() : email.toLowerCase().trim(),
      gstState:
        (address && typeof address === 'object' && address.state) ||
        process.env.DEFAULT_GST_STATE ||
        '',
      currency: process.env.DEFAULT_CURRENCY || 'INR',
      owner: user._id,
    });
    console.log('[REGISTER] Shop Saved:', shop._id);
  } catch (err) {
    console.error('[REGISTER] Shop Save Failed — rolling back User:', err.message);

    // ── Compensating rollback: delete the User saved in Step 4 ──────────
    await rollbackUser(user._id);
    console.log('[REGISTER] Transaction Aborted ✗ (Shop save failed, User rolled back)');

    if (err.name === 'ValidationError') {
      const fieldErrors = Object.entries(err.errors).map(([field, e]) => ({
        field,
        message: e.message,
        receivedValue: e.value ?? null,
      }));
      return res.status(400).json({
        success: false,
        step: 'Shop Validation',
        message: 'Validation failed. Please fix the errors below.',
        errors: fieldErrors,
        field: fieldErrors[0]?.field,
        receivedValue: fieldErrors[0]?.receivedValue,
        expectedFormat: fieldErrors[0]?.field === 'gstin' ? '22AAAAA0000A1Z5' : undefined,
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'unknown';
      return res.status(409).json({
        success: false,
        step: 'Shop Save',
        field,
        message: `A record with this ${field} already exists.`,
        receivedValue: err.keyValue?.[field],
      });
    }

    return next(err);
  }

  // ─── Step 6: Link shop back to user + issue tokens ────────────────────────
  // Now that we have the real shop._id, update user.shop and save refresh token.
  // If this final save fails, roll back both User and Shop.
  try {
    const accessToken = generateAccessToken({ _id: user._id, role: user.role, shop: shop._id });
    const refreshToken = generateRefreshToken({ _id: user._id });

    user.shop = shop._id;
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    console.log('[REGISTER] User Updated with shop ref and refresh token');
    console.log('[REGISTER] Transaction Committed ✓');

    return res.status(201).json({
      success: true,
      message: 'Shop registered and owner account created successfully.',
      data: {
        user: user.toJSON(),
        shop: {
          _id: shop._id,
          shopName: shop.shopName,
          gstin: shop.gstin,
          address: shop.address,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[REGISTER] Final user.save() failed — rolling back User and Shop:', err.message);

    // ── Compensating rollback: delete both records ───────────────────────
    await rollbackUser(user._id);
    await rollbackShop(shop._id);
    console.log('[REGISTER] Transaction Aborted ✗ (final save failed, both records rolled back)');

    return next(err);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include passwordHash for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact the shop owner.',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Get shop info
    const shop = await Shop.findById(user.shop).select('shopName gstin address');

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toJSON(),
        shop,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token.
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }

    const user = await User.findOne({ _id: decoded.id, refreshToken });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not recognized. Please login again.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const shop = await Shop.findById(user.shop);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        shop,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/employees
 * Owner creates an employee account.
 */
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash: password,
      role: 'employee',
      shop: req.user.shop,
    });

    res.status(201).json({
      success: true,
      message: 'Employee account created successfully.',
      data: employee.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/employees
 */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({
      shop: req.user.shop,
      role: 'employee',
    }).select('-passwordHash -refreshToken');

    res.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/employees/:id/toggle
 */
const toggleEmployee = async (req, res, next) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      shop: req.user.shop,
      role: 'employee',
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    employee.isActive = !employee.isActive;
    if (!employee.isActive) {
      employee.refreshToken = null;
    }
    await employee.save();

    res.json({
      success: true,
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'}.`,
      data: employee.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerShopAndOwner,
  login,
  refreshAccessToken,
  logout,
  getMe,
  createEmployee,
  getEmployees,
  toggleEmployee,
};
