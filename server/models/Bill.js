const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    priceAtSale: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    costPriceAtSale: {
      type: Number,
      default: 0,
    },
    gstRate: {
      type: Number,
      required: true,
    },
    cgst: {
      type: Number,
      required: true,
    },
    sgst: {
      type: Number,
      required: true,
    },
    itemTotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
    },
    items: {
      type: [billItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Bill must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCgst: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSgst: {
      type: Number,
      required: true,
      default: 0,
    },
    totalGst: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: null,
      trim: true,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash'],
      default: 'cash',
    },
    paymentDetails: {
      amountPaid: { type: Number, default: 0 },
      change: { type: Number, default: 0 },
    },
    customer: {
      name: { type: String, trim: true, default: 'Walk-in Customer' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
    },
    billedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    qrCodeData: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate bill number
billSchema.pre('validate', async function (next) {
  if (!this.billNumber) {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const count = await mongoose.model('Bill').countDocuments({
      shop: this.shop,
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    this.billNumber = `BILL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

billSchema.index({ shop: 1, createdAt: -1 });
billSchema.index({ shop: 1, billNumber: 1 }, { unique: true });
billSchema.index({ 'customer.phone': 1 });
billSchema.index({ shop: 1, billedBy: 1 });

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
