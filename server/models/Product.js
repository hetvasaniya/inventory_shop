const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      uppercase: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
      enum: ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'pair'],
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    gstRate: {
      type: Number,
      default: 18,
      enum: [0, 5, 12, 18, 28],
    },
    hsnCode: {
      type: String,
      trim: true,
      default: '',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
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

// Auto-generate SKU before saving
productSchema.pre('save', async function (next) {
  if (!this.sku) {
    // Find the highest existing SKU for this shop and increment
    const lastProduct = await mongoose.model('Product')
      .findOne({ shop: this.shop, sku: /^PRD-\d+$/ })
      .sort({ sku: -1 })
      .select('sku')
      .lean();

    let nextNum = 1;
    if (lastProduct && lastProduct.sku) {
      const match = lastProduct.sku.match(/PRD-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    this.sku = `PRD-${String(nextNum).padStart(4, '0')}`;
  }
  if (!this.barcode) {
    // Generate a 13-digit EAN-like barcode using crypto for better uniqueness
    const crypto = require('crypto');
    const randomHex = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    this.barcode = `890${randomHex}`;
  }
  next();
});

// Index for text search and common queries
productSchema.index({ name: 'text', category: 'text', brand: 'text', sku: 'text' });
productSchema.index({ shop: 1, category: 1 });
productSchema.index({ shop: 1, isActive: 1 });
productSchema.index({ shop: 1, expiryDate: 1 });
productSchema.index({ shop: 1, sku: 1 }, { unique: true });
productSchema.index({ shop: 1, barcode: 1 }, { unique: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
