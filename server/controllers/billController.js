const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const DailyIncome = require('../models/DailyIncome');
const Shop = require('../models/Shop');
const { calculateItemGST, roundTo2 } = require('../utils/gstCalculator');
const { generateBillPDF } = require('../utils/generateBillPDF');
const { sendBillEmail, generateWhatsAppLink } = require('../utils/emailService');

/**
 * POST /api/bills
 * Create a new bill with MongoDB transaction for atomic stock decrement.
 * Body: {
 *   items: [{ productId, quantity }],
 *   couponCode?: string,
 *   customer?: { name, phone, email },
 *   paymentDetails?: { amountPaid }
 * }
 */
const createBill = async (req, res, next) => {
  const isStandalone = mongoose.connection?.client?.topology?.description?.type === 'Single';
  const session = isStandalone ? null : await mongoose.startSession();
  if (session) session.startTransaction();

  try {
    const { items, couponCode, customer, paymentDetails } = req.body;

    if (!items || items.length === 0) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'Bill must have at least one item.',
      });
    }

    // Fetch all products in the bill
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      shop: req.user.shop,
      isActive: true,
    }).session(session);

    // Map products by ID for quick lookup
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    // Validate and build bill items
    const billItems = [];
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalCost = 0;

    for (const item of items) {
      const product = productMap[item.productId];

      if (!product) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      if (product.stock < item.quantity) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      // Calculate GST for this item
      const gst = calculateItemGST(product.sellingPrice, item.quantity, product.gstRate);

      const billItem = {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        priceAtSale: product.sellingPrice,
        costPriceAtSale: product.costPrice,
        gstRate: product.gstRate,
        cgst: gst.cgst,
        sgst: gst.sgst,
        itemTotal: gst.itemTotal,
        hsnCode: product.hsnCode || '',
      };

      billItems.push(billItem);
      subtotal += gst.baseAmount;
      totalCgst += gst.cgst;
      totalSgst += gst.sgst;
      totalCost += product.costPrice * item.quantity;

      // Decrement stock atomically
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    subtotal = roundTo2(subtotal);
    totalCgst = roundTo2(totalCgst);
    totalSgst = roundTo2(totalSgst);
    const totalGst = roundTo2(totalCgst + totalSgst);
    let grandTotal = roundTo2(subtotal + totalGst);

    // Apply coupon discount
    let discount = 0;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        shop: req.user.shop,
      }).session(session);

      if (coupon) {
        const validation = coupon.isValid(grandTotal);
        if (validation.valid) {
          discount = coupon.calculateDiscount(grandTotal);
          appliedCouponCode = coupon.code;

          // Increment usage count
          await Coupon.findByIdAndUpdate(
            coupon._id,
            { $inc: { usedCount: 1 } },
            { session }
          );
        }
        // Silently skip invalid coupons — the bill still goes through
      }
    }

    grandTotal = roundTo2(grandTotal - discount);

    // Calculate change
    const amountPaid = (paymentDetails && paymentDetails.amountPaid) || grandTotal;
    const change = roundTo2(Math.max(0, amountPaid - grandTotal));

    // Create bill
    const bill = new Bill({
      items: billItems,
      subtotal,
      totalCgst,
      totalSgst,
      totalGst,
      discount,
      couponCode: appliedCouponCode,
      grandTotal,
      paymentMethod: 'cash',
      paymentDetails: { amountPaid, change },
      customer: {
        name: (customer && customer.name) || 'Walk-in Customer',
        phone: (customer && customer.phone) || '',
        email: (customer && customer.email) || '',
      },
      billedBy: req.user._id,
      shop: req.user.shop,
    });

    await bill.save(session ? { session } : {});

    // Update daily income
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalItemsSold = billItems.reduce((sum, i) => sum + i.quantity, 0);

    await DailyIncome.findOneAndUpdate(
      { shop: req.user.shop, date: today },
      {
        $inc: {
          totalRevenue: grandTotal,
          totalCost: totalCost,
          totalProfit: roundTo2(grandTotal - totalCost),
          totalGstCollected: totalGst,
          totalDiscount: discount,
          billCount: 1,
          itemsSold: totalItemsSold,
        },
      },
      { upsert: true, session }
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Emit real-time events (after commit)
    const io = req.app.get('io');
    if (io) {
      const shopRoom = req.user.shop.toString();
      io.to(shopRoom).emit('bill:created', {
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        itemCount: bill.items.length,
      });

      // Check for low stock alerts
      for (const item of items) {
        const updatedProduct = await Product.findById(item.productId);
        if (updatedProduct && updatedProduct.stock <= updatedProduct.minStockLevel) {
          io.to(shopRoom).emit('stock:low', {
            productId: updatedProduct._id,
            name: updatedProduct.name,
            stock: updatedProduct.stock,
            minStockLevel: updatedProduct.minStockLevel,
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Bill created successfully.',
      data: bill,
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(error);
  }
};

/**
 * GET /api/bills
 * List bills with pagination and filters.
 * Query: ?page=1&limit=20&startDate=&endDate=&search=
 */
const getBills = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { shop: req.user.shop };

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search by bill number or customer
    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bills, total] = await Promise.all([
      Bill.find(query)
        .populate('billedBy', 'name')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Bill.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: bills,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bills/:id
 * Get a single bill by ID.
 */
const getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    }).populate('billedBy', 'name email');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found.',
      });
    }

    res.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bills/:id/pdf
 * Download bill as PDF.
 */
const getBillPDF = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    }).populate('billedBy', 'name');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found.',
      });
    }

    const shop = await Shop.findById(req.user.shop);
    const pdfBuffer = await generateBillPDF(bill, shop);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bill.billNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bills/:id/share/email
 * Email the bill PDF to the customer.
 */
const shareBillEmail = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const recipientEmail = req.body.email || bill.customer.email;
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'No email address provided.',
      });
    }

    const shop = await Shop.findById(req.user.shop);
    const pdfBuffer = await generateBillPDF(bill, shop);

    const result = await sendBillEmail(recipientEmail, pdfBuffer, bill.billNumber, shop.shopName);

    if (result.skipped) {
      return res.status(503).json({
        success: false,
        message: 'Email service not configured. Set SMTP_USER and SMTP_PASS in .env',
      });
    }

    res.json({
      success: true,
      message: `Bill emailed to ${recipientEmail}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bills/:id/share/whatsapp
 * Get a WhatsApp share link for the bill.
 */
const shareBillWhatsApp = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const phone = req.query.phone || bill.customer.phone;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number provided.',
      });
    }

    const shop = await Shop.findById(req.user.shop);
    const link = generateWhatsAppLink(phone, bill.billNumber, bill.grandTotal, shop.shopName);

    res.json({
      success: true,
      data: { whatsappLink: link },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBills,
  getBill,
  getBillPDF,
  shareBillEmail,
  shareBillWhatsApp,
};
