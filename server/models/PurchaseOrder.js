const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  unit: {
    type: String,
    default: 'pcs',
  },
  currentStock: {
    type: Number,
    default: 0,
  },
  orderQty: {
    type: Number,
    required: [true, 'Order quantity is required'],
    min: [1, 'Order quantity must be at least 1'],
  },
  receivedQty: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative'],
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative'],
  },
  gstRate: {
    type: Number,
    default: 0,
    min: [0, 'GST rate cannot be negative'],
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
});

const receiptHistorySchema = new mongoose.Schema({
  receiptDate: {
    type: Date,
    default: Date.now,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: String,
      quantityReceived: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop reference is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'A purchase order must contain at least one product item.',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    gstTotal: {
      type: Number,
      default: 0,
      min: [0, 'GST total cannot be negative'],
    },
    deliveryCharges: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charges cannot be negative'],
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Grand total cannot be negative'],
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Pending',
        'Ordered',
        'Confirmed',
        'Shipped',
        'Partially Received',
        'Received',
        'Cancelled',
      ],
      default: 'Pending',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiptHistory: [receiptHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Auto-generate PO Number before saving
purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastPO = await mongoose
      .model('PurchaseOrder')
      .findOne({ shop: this.shop, poNumber: new RegExp(`^${prefix}\\d+$`) })
      .sort({ poNumber: -1 })
      .select('poNumber')
      .lean();

    let nextNum = 1;
    if (lastPO && lastPO.poNumber) {
      const match = lastPO.poNumber.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    this.poNumber = `${prefix}${String(nextNum).padStart(5, '0')}`;
  }
  next();
});

// Indexes for fast searching and filtering
purchaseOrderSchema.index({ shop: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ shop: 1, supplier: 1 });
purchaseOrderSchema.index({ shop: 1, status: 1 });
purchaseOrderSchema.index({ shop: 1, orderDate: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
