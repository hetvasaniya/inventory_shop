const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');
const { generatePurchaseOrderPDF } = require('../utils/generatePurchaseOrderPDF');

/**
 * Helper to calculate PO items and totals
 */
const calculateOrderItems = (items) => {
  let subtotal = 0;
  let gstTotal = 0;

  const processedItems = items.map((item) => {
    const orderQty = Math.max(1, parseInt(item.orderQty, 10) || 1);
    const purchasePrice = Math.max(0, parseFloat(item.purchasePrice) || 0);
    const gstRate = Math.max(0, parseFloat(item.gstRate) || 0);

    const baseAmount = purchasePrice * orderQty;
    const taxAmount = (baseAmount * gstRate) / 100;
    const totalAmount = baseAmount + taxAmount;

    subtotal += baseAmount;
    gstTotal += taxAmount;

    return {
      product: item.product || item._id,
      name: item.name,
      sku: item.sku || '',
      unit: item.unit || 'pcs',
      currentStock: item.currentStock != null ? item.currentStock : 0,
      orderQty,
      receivedQty: item.receivedQty || 0,
      purchasePrice,
      gstRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  });

  return {
    processedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    gstTotal: parseFloat(gstTotal.toFixed(2)),
  };
};

/**
 * POST /api/purchase-orders
 * Create a new purchase order for a supplier.
 */
const createPurchaseOrder = async (req, res, next) => {
  try {
    const {
      supplier: supplierId,
      items,
      deliveryCharges = 0,
      expectedDeliveryDate,
      notes,
      status = 'Pending',
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier is required.',
      });
    }

    const supplier = await Supplier.findOne({
      _id: supplierId,
      shop: req.user.shop,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order must contain at least one product item.',
      });
    }

    // Validate and calculate items
    const { processedItems, subtotal, gstTotal } = calculateOrderItems(items);
    const delCharges = Math.max(0, parseFloat(deliveryCharges) || 0);
    const grandTotal = parseFloat((subtotal + gstTotal + delCharges).toFixed(2));

    const purchaseOrder = await PurchaseOrder.create({
      shop: req.user.shop,
      supplier: supplier._id,
      items: processedItems,
      subtotal,
      gstTotal,
      deliveryCharges: delCharges,
      grandTotal,
      status,
      expectedDeliveryDate: expectedDeliveryDate || null,
      notes: notes || '',
      createdBy: req.user._id,
    });

    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name contactPerson phone email gstin address')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: `Purchase Order ${purchaseOrder.poNumber} created successfully.`,
      data: populatedPO,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/purchase-orders/bulk
 * Create bulk purchase orders grouped automatically by supplier.
 */
const createBulkPurchaseOrders = async (req, res, next) => {
  try {
    const { items, expectedDeliveryDate, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products selected for purchase order creation.',
      });
    }

    // Fetch products to verify suppliers
    const productIds = items.map((i) => i.productId || i.product || i._id);
    const products = await Product.find({
      _id: { $in: productIds },
      shop: req.user.shop,
      isActive: true,
    }).populate('supplier');

    // Group items by supplier
    const supplierGroups = {};
    const unassignedProducts = [];

    for (const item of items) {
      const pId = (item.productId || item.product || item._id).toString();
      const product = products.find((p) => p._id.toString() === pId);

      if (!product) continue;

      if (!product.supplier || !product.supplier._id) {
        unassignedProducts.push(product.name);
        continue;
      }

      const sId = product.supplier._id.toString();
      if (!supplierGroups[sId]) {
        supplierGroups[sId] = {
          supplier: product.supplier,
          items: [],
        };
      }

      const orderQty =
        item.orderQty ||
        Math.max(
          1,
          (product.targetStockLevel || product.minStockLevel * 2 || 50) - product.stock
        );

      supplierGroups[sId].items.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        currentStock: product.stock,
        orderQty,
        purchasePrice: item.purchasePrice != null ? item.purchasePrice : product.costPrice,
        gstRate: product.gstRate || 0,
      });
    }

    if (Object.keys(supplierGroups).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          unassignedProducts.length > 0
            ? `Cannot create purchase orders. The following products do not have a supplier assigned: ${unassignedProducts.join(
                ', '
              )}. Please assign suppliers first.`
            : 'No valid products to create purchase orders.',
        unassignedProducts,
      });
    }

    const createdOrders = [];

    for (const sId of Object.keys(supplierGroups)) {
      const group = supplierGroups[sId];
      const { processedItems, subtotal, gstTotal } = calculateOrderItems(group.items);
      const grandTotal = parseFloat((subtotal + gstTotal).toFixed(2));

      const po = await PurchaseOrder.create({
        shop: req.user.shop,
        supplier: group.supplier._id,
        items: processedItems,
        subtotal,
        gstTotal,
        deliveryCharges: 0,
        grandTotal,
        status: 'Pending',
        expectedDeliveryDate: expectedDeliveryDate || null,
        notes: notes || 'Generated from bulk restocking',
        createdBy: req.user._id,
      });

      const populated = await PurchaseOrder.findById(po._id).populate(
        'supplier',
        'name contactPerson phone email gstin address'
      );
      createdOrders.push(populated);
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdOrders.length} Purchase Order(s) grouped by supplier.`,
      data: createdOrders,
      unassignedProducts: unassignedProducts.length > 0 ? unassignedProducts : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchase-orders
 * List all purchase orders with filtering, search, and pagination.
 */
const getPurchaseOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      supplier,
      status,
      startDate,
      endDate,
      sortBy = 'orderDate',
      sortOrder = 'desc',
    } = req.query;

    const query = { shop: req.user.shop };

    if (supplier) {
      query.supplier = supplier;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    if (search) {
      // Find suppliers matching search first
      const matchingSuppliers = await Supplier.find({
        shop: req.user.shop,
        name: { $regex: search, $options: 'i' },
      }).select('_id');

      const supplierIds = matchingSuppliers.map((s) => s._id);

      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { supplier: { $in: supplierIds } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplier', 'name contactPerson phone email gstin')
        .populate('createdBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      PurchaseOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchase-orders/:id
 * Get single purchase order by ID.
 */
const getPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    })
      .populate('supplier', 'name contactPerson phone email gstin address')
      .populate('createdBy', 'name email')
      .populate('receiptHistory.receivedBy', 'name email')
      .populate('items.product', 'name sku stock costPrice sellingPrice');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    res.json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/purchase-orders/:id
 * Update a purchase order (if not completely received or cancelled).
 */
const updatePurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    if (purchaseOrder.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a cancelled purchase order.',
      });
    }

    if (purchaseOrder.status === 'Received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a fully received purchase order.',
      });
    }

    const { items, deliveryCharges, expectedDeliveryDate, notes, status } = req.body;

    if (items && Array.isArray(items) && items.length > 0) {
      const { processedItems, subtotal, gstTotal } = calculateOrderItems(items);
      const delCharges =
        deliveryCharges !== undefined
          ? Math.max(0, parseFloat(deliveryCharges) || 0)
          : purchaseOrder.deliveryCharges;

      purchaseOrder.items = processedItems;
      purchaseOrder.subtotal = subtotal;
      purchaseOrder.gstTotal = gstTotal;
      purchaseOrder.deliveryCharges = delCharges;
      purchaseOrder.grandTotal = parseFloat(
        (subtotal + gstTotal + delCharges).toFixed(2)
      );
    } else if (deliveryCharges !== undefined) {
      const delCharges = Math.max(0, parseFloat(deliveryCharges) || 0);
      purchaseOrder.deliveryCharges = delCharges;
      purchaseOrder.grandTotal = parseFloat(
        (purchaseOrder.subtotal + purchaseOrder.gstTotal + delCharges).toFixed(2)
      );
    }

    if (expectedDeliveryDate !== undefined) {
      purchaseOrder.expectedDeliveryDate = expectedDeliveryDate || null;
    }
    if (notes !== undefined) {
      purchaseOrder.notes = notes;
    }
    if (status && status !== 'Received' && status !== 'Partially Received') {
      purchaseOrder.status = status;
    }

    await purchaseOrder.save();

    const updated = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name contactPerson phone email gstin address')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Purchase Order updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/purchase-orders/:id (or Cancel)
 * Cancel a purchase order safely without altering inventory.
 */
const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    if (purchaseOrder.status === 'Received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already been completely received.',
      });
    }

    purchaseOrder.status = 'Cancelled';
    await purchaseOrder.save();

    res.json({
      success: true,
      message: `Purchase Order ${purchaseOrder.poNumber} has been cancelled.`,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/purchase-orders/:id/receive
 * Receive products from a Purchase Order and automatically update inventory.
 * Supports partial receiving and prevents duplicate stock increments.
 */
const receivePurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    if (purchaseOrder.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive items from a cancelled purchase order.',
      });
    }

    if (purchaseOrder.status === 'Received') {
      return res.status(400).json({
        success: false,
        message:
          'Purchase Order has already been completely received. Duplicate stock updates prevented.',
      });
    }

    const { receiptItems, notes } = req.body;
    const historyItemRecords = [];
    const stockUpdates = [];

    // If receiptItems array is provided (partial or specific receive)
    if (receiptItems && Array.isArray(receiptItems) && receiptItems.length > 0) {
      for (const rItem of receiptItems) {
        const pId = (rItem.product || rItem.productId || rItem._id).toString();
        const qtyToReceive = parseInt(rItem.quantityReceived, 10);

        if (!qtyToReceive || qtyToReceive <= 0) continue;

        const poItem = purchaseOrder.items.find(
          (item) => item.product.toString() === pId
        );

        if (!poItem) {
          return res.status(400).json({
            success: false,
            message: `Product ID ${pId} is not part of this purchase order.`,
          });
        }

        const remainingQty = poItem.orderQty - poItem.receivedQty;
        if (qtyToReceive > remainingQty) {
          return res.status(400).json({
            success: false,
            message: `Cannot receive ${qtyToReceive} for "${poItem.name}". Only ${remainingQty} remaining.`,
          });
        }

        poItem.receivedQty += qtyToReceive;

        historyItemRecords.push({
          product: poItem.product,
          name: poItem.name,
          quantityReceived: qtyToReceive,
        });

        stockUpdates.push({
          productId: poItem.product,
          qty: qtyToReceive,
        });
      }
    } else {
      // Full receive: receive all remaining quantities
      for (const poItem of purchaseOrder.items) {
        const remainingQty = poItem.orderQty - poItem.receivedQty;
        if (remainingQty > 0) {
          poItem.receivedQty += remainingQty;

          historyItemRecords.push({
            product: poItem.product,
            name: poItem.name,
            quantityReceived: remainingQty,
          });

          stockUpdates.push({
            productId: poItem.product,
            qty: remainingQty,
          });
        }
      }
    }

    if (historyItemRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending items or quantities to receive.',
      });
    }

    // Determine overall PO status
    const allReceived = purchaseOrder.items.every(
      (item) => item.receivedQty >= item.orderQty
    );
    purchaseOrder.status = allReceived ? 'Received' : 'Partially Received';

    // Record in receipt history
    purchaseOrder.receiptHistory.push({
      receiptDate: new Date(),
      receivedBy: req.user._id,
      items: historyItemRecords,
      notes: notes || 'Stock received and inventory updated.',
    });

    await purchaseOrder.save();

    // Increment inventory stock in Product model
    const io = req.app.get('io');
    for (const update of stockUpdates) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: update.productId, shop: req.user.shop },
        { $inc: { stock: update.qty } },
        { new: true }
      );

      if (updatedProduct && io) {
        io.to(req.user.shop.toString()).emit('stock:updated', {
          productId: updatedProduct._id,
          name: updatedProduct.name,
          stock: updatedProduct.stock,
          minStockLevel: updatedProduct.minStockLevel,
          isLow: updatedProduct.stock <= updatedProduct.minStockLevel,
        });
      }
    }

    const updatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name contactPerson phone email gstin address')
      .populate('createdBy', 'name email')
      .populate('receiptHistory.receivedBy', 'name email')
      .populate('items.product', 'name sku stock costPrice sellingPrice');

    res.json({
      success: true,
      message: allReceived
        ? `Purchase Order ${purchaseOrder.poNumber} marked as fully Received. Inventory updated.`
        : `Purchase Order ${purchaseOrder.poNumber} partially received. Inventory updated.`,
      data: updatedPO,
      receivedItems: historyItemRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchase-orders/supplier/:supplierId/analysis
 * Smart stock analysis for a supplier.
 * Returns out-of-stock, low-stock, and in-stock products with suggested quantities.
 */
const getSupplierStockAnalysis = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({
      _id: supplierId,
      shop: req.user.shop,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const products = await Product.find({
      supplier: supplier._id,
      shop: req.user.shop,
      isActive: true,
    }).sort({ stock: 1, name: 1 });

    const outOfStockProducts = [];
    const lowStockProducts = [];
    const inStockProducts = [];

    for (const prod of products) {
      const targetStock = prod.targetStockLevel || prod.minStockLevel * 2 || 50;
      const minStock = prod.minStockLevel != null ? prod.minStockLevel : 10;

      if (prod.stock === 0) {
        // Out of Stock: suggest targetStock
        const suggestedQty = targetStock;
        outOfStockProducts.push({
          ...prod.toObject(),
          status: 'OUT_OF_STOCK',
          targetStockLevel: targetStock,
          suggestedQty,
          orderQty: suggestedQty,
        });
      } else if (prod.stock <= minStock) {
        // Low Stock: suggest targetStock - currentStock
        const suggestedQty = Math.max(1, targetStock - prod.stock);
        lowStockProducts.push({
          ...prod.toObject(),
          status: 'LOW_STOCK',
          targetStockLevel: targetStock,
          suggestedQty,
          orderQty: suggestedQty,
        });
      } else {
        // In Stock: normal
        const suggestedQty = Math.max(0, targetStock - prod.stock);
        inStockProducts.push({
          ...prod.toObject(),
          status: 'IN_STOCK',
          targetStockLevel: targetStock,
          suggestedQty,
          orderQty: suggestedQty > 0 ? suggestedQty : 10,
        });
      }
    }

    res.json({
      success: true,
      data: {
        supplier,
        summary: {
          totalProducts: products.length,
          outOfStockCount: outOfStockProducts.length,
          lowStockCount: lowStockProducts.length,
          inStockCount: inStockProducts.length,
        },
        outOfStockProducts,
        lowStockProducts,
        inStockProducts,
        allProducts: products,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchase-orders/supplier/:supplierId/history
 * Get purchase history and metrics for a supplier.
 */
const getSupplierPurchaseHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({
      _id: supplierId,
      shop: req.user.shop,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const orders = await PurchaseOrder.find({
      supplier: supplier._id,
      shop: req.user.shop,
    })
      .sort({ orderDate: -1 })
      .populate('createdBy', 'name');

    let totalPurchaseAmount = 0;
    let pendingCount = 0;
    let orderedCount = 0;
    let receivedCount = 0;
    let cancelledCount = 0;

    orders.forEach((order) => {
      if (order.status !== 'Cancelled') {
        totalPurchaseAmount += order.grandTotal;
      }
      if (order.status === 'Pending' || order.status === 'Draft') pendingCount++;
      if (
        order.status === 'Ordered' ||
        order.status === 'Confirmed' ||
        order.status === 'Shipped' ||
        order.status === 'Partially Received'
      )
        orderedCount++;
      if (order.status === 'Received') receivedCount++;
      if (order.status === 'Cancelled') cancelledCount++;
    });

    res.json({
      success: true,
      data: {
        supplier,
        metrics: {
          totalOrders: orders.length,
          pendingOrders: pendingCount,
          orderedOrders: orderedCount,
          receivedOrders: receivedCount,
          cancelledOrders: cancelledCount,
          totalPurchaseAmount: parseFloat(totalPurchaseAmount.toFixed(2)),
        },
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchase-orders/:id/pdf
 * Generate and download/stream Purchase Order PDF.
 */
const getPurchaseOrderPDF = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    })
      .populate('supplier', 'name contactPerson phone email gstin address')
      .populate('createdBy', 'name email');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    const shop = await Shop.findById(req.user.shop);

    const pdfBuffer = await generatePurchaseOrderPDF(purchaseOrder, shop);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PO-${purchaseOrder.poNumber || purchaseOrder._id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchaseOrder,
  createBulkPurchaseOrders,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
  getSupplierStockAnalysis,
  getSupplierPurchaseHistory,
  getPurchaseOrderPDF,
};

