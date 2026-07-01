const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

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

/**
 * POST /api/auth/register
 * Register a new shop + owner account.
 * Body: { shopName, gstin, address, phone, name, email, password }
 */
const registerShopAndOwner = async (req, res, next) => {
  try {
    const { shopName, gstin, address, phone, shopEmail, name, email, password } = req.body;

    // Check if GSTIN already registered
    const existingShop = await Shop.findOne({ gstin: gstin.toUpperCase() });
    if (existingShop) {
      return res.status(409).json({
        success: false,
        message: 'A shop with this GSTIN is already registered.',
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 1. Create the shop first (without owner ref for now)
    const shop = await Shop.create({
      shopName,
      gstin: gstin.toUpperCase(),
      address: typeof address === 'string' ? { street: address } : (address || {}),
      phone: phone || '',
      email: shopEmail || email,
      gstState: (address && typeof address === 'object' && address.state) || process.env.DEFAULT_GST_STATE || '',
      currency: process.env.DEFAULT_CURRENCY || 'INR',
    });

    // 2. Create the owner user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password, // pre-save hook will hash it
      role: 'owner',
      shop: shop._id,
    });

    // 3. Link owner back to shop
    shop.owner = user._id;
    await shop.save();

    // 4. Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 5. Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
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
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password.
 * Body: { email, password }
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
 * Body: { refreshToken }
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

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }

    // Find user with matching refresh token
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

    // Generate new tokens
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
 * Invalidate refresh token.
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
 * Get current user profile.
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
 * Body: { name, email, password, phone }
 */
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email already exists
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
 * Owner lists all employees of the shop.
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
 * Owner activates/deactivates an employee.
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
      employee.refreshToken = null; // Force logout
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
