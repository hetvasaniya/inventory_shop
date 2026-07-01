const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [100, 'Shop name cannot exceed 100 characters'],
    },
    gstin: {
      type: String,
      required: [true, 'GSTIN is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Please provide a valid 15-digit GSTIN',
      ],
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: {
        type: String,
        trim: true,
        default: '',
        match: [/^[1-9][0-9]{5}$|^$/, 'Please provide a valid 6-digit pincode'],
      },
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^[6-9]\d{9}$|^$/, 'Please provide a valid 10-digit Indian phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^\S+@\S+\.\S+$|^$/, 'Please provide a valid email'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    logo: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    gstState: {
      type: String,
      default: '',
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

// Index for text search
shopSchema.index({ shopName: 'text' });

module.exports = mongoose.model('Shop', shopSchema);
