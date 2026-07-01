const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^\S+@\S+\.\S+$|^$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^[6-9]\d{9}$|^$/, 'Please provide a valid 10-digit Indian phone number'],
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
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

// Index for text search
supplierSchema.index({ name: 'text', contactPerson: 'text' });
supplierSchema.index({ shop: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
