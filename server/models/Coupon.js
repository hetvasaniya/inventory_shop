const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop reference is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid
couponSchema.methods.isValid = function (orderAmount) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (now < this.validFrom) return { valid: false, message: 'Coupon is not yet active' };
  if (now > this.validUntil) return { valid: false, message: 'Coupon has expired' };
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }
  if (orderAmount < this.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount is ₹${this.minOrderAmount}`,
    };
  }
  return { valid: true, message: 'Coupon is valid' };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount !== null) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.discountValue;
  }
  return Math.round(discount * 100) / 100;
};

couponSchema.index({ shop: 1 });
couponSchema.index({ shop: 1, code: 1 }, { unique: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
