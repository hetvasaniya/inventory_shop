const Coupon = require('../models/Coupon');

/**
 * POST /api/coupons
 * Create a new coupon (owner only).
 */
const createCoupon = async (req, res, next) => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, usageLimit,
      validFrom, validUntil,
    } = req.body;

    // Check for duplicate code in this shop
    const existing = await Coupon.findOne({
      code: code.toUpperCase(),
      shop: req.user.shop,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A coupon with this code already exists.',
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description: description || '',
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      usageLimit: usageLimit || null,
      validFrom: validFrom || new Date(),
      validUntil,
      shop: req.user.shop,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/coupons
 * List all coupons for the shop.
 */
const getCoupons = async (req, res, next) => {
  try {
    const { active } = req.query;
    const query = { shop: req.user.shop };

    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.validFrom = { $lte: now };
      query.validUntil = { $gte: now };
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: coupons,
      count: coupons.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/coupons/:id
 * Get a single coupon.
 */
const getCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    res.json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/coupons/validate
 * Validate a coupon code for a given order amount.
 * Body: { code, orderAmount }
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || orderAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and order amount are required.',
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      shop: req.user.shop,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    const validation = coupon.isValid(orderAmount);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const discount = coupon.calculateDiscount(orderAmount);

    res.json({
      success: true,
      message: 'Coupon is valid.',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        calculatedDiscount: discount,
        finalAmount: Math.round((orderAmount - discount) * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/coupons/:id
 * Update a coupon (owner only).
 */
const updateCoupon = async (req, res, next) => {
  try {
    const allowedFields = [
      'description', 'discountType', 'discountValue',
      'minOrderAmount', 'maxDiscountAmount', 'usageLimit',
      'validFrom', 'validUntil', 'isActive',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      updates,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully.',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/coupons/:id
 * Deactivate a coupon (owner only).
 */
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      { isActive: false },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    res.json({
      success: true,
      message: 'Coupon deactivated successfully.',
      data: { _id: coupon._id, code: coupon.code },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCoupon,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
};
