const Product = require('../models/Product');

/**
 * POST /api/products
 * Create a new product.
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name, category, subcategory, brand,
      costPrice, sellingPrice, stock, unit,
      minStockLevel, gstRate, hsnCode, expiryDate, supplier,
    } = req.body;

    // Check for duplicate product (same name, category, brand in same shop)
    const duplicate = await Product.findOne({
      shop: req.user.shop,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      category: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
      brand: brand ? { $regex: new RegExp(`^${brand.trim()}$`, 'i') } : '',
      isActive: true,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A product with the same name, category, and brand already exists.',
        data: { existingProduct: duplicate },
      });
    }

    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      subcategory: subcategory || '',
      brand: brand || '',
      costPrice,
      sellingPrice,
      stock: stock || 0,
      unit: unit || 'pcs',
      minStockLevel: minStockLevel != null ? minStockLevel : 10,
      gstRate: gstRate != null ? gstRate : 18,
      hsnCode: hsnCode || '',
      expiryDate: expiryDate || null,
      supplier: supplier || null,
      shop: req.user.shop,
    });

    // Emit real-time stock event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user.shop.toString()).emit('product:created', {
        product: { _id: product._id, name: product.name, stock: product.stock, sku: product.sku },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products
 * List all products for the shop with pagination, search, and filters.
 * Query: ?page=1&limit=20&search=term&category=X&lowStock=true&expiringSoon=true
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      lowStock,
      expiringSoon,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = req.query;

    const query = { shop: req.user.shop };

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true;
    }

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Brand filter
    if (brand) {
      query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
    }

    // Low stock filter
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    }

    // Expiring soon filter (within 30 days)
    if (expiringSoon === 'true') {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $ne: null, $lte: thirtyDaysLater, $gte: now };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('supplier', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
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
 * GET /api/products/:id
 * Get a single product by ID.
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    }).populate('supplier', 'name phone email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/barcode/:barcode
 * Get a product by barcode (for scanner input).
 */
const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.barcode,
      shop: req.user.shop,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for this barcode.',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * Update a product.
 */
const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'category', 'subcategory', 'brand',
      'costPrice', 'sellingPrice', 'stock', 'unit',
      'minStockLevel', 'gstRate', 'hsnCode', 'expiryDate',
      'supplier', 'isActive',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Emit stock update if stock was changed
    const io = req.app.get('io');
    if (io && updates.stock !== undefined) {
      io.to(req.user.shop.toString()).emit('stock:updated', {
        productId: product._id,
        name: product.name,
        stock: product.stock,
        minStockLevel: product.minStockLevel,
        isLow: product.stock <= product.minStockLevel,
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Soft-delete a product (set isActive to false).
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully.',
      data: { _id: product._id, name: product.name },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/categories/list
 * Get all unique categories for the shop.
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', {
      shop: req.user.shop,
      isActive: true,
    });

    res.json({
      success: true,
      data: categories.sort(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/expiring/soon
 * Get products expiring within N days (default 30).
 */
const getExpiringProducts = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const products = await Product.find({
      shop: req.user.shop,
      isActive: true,
      expiryDate: { $ne: null, $lte: futureDate },
    })
      .sort({ expiryDate: 1 })
      .select('name sku barcode expiryDate stock category');

    // Separate into expired and expiring soon
    const expired = products.filter((p) => p.expiryDate < now);
    const expiringSoon = products.filter((p) => p.expiryDate >= now);

    res.json({
      success: true,
      data: {
        expired: { count: expired.length, products: expired },
        expiringSoon: { count: expiringSoon.length, products: expiringSoon },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/low-stock/list
 * Get products with stock at or below minimum level.
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      shop: req.user.shop,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockLevel'] },
    })
      .sort({ stock: 1 })
      .select('name sku stock minStockLevel category supplier')
      .populate('supplier', 'name phone');

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
  getCategories,
  getExpiringProducts,
  getLowStockProducts,
};
