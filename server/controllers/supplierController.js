const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

/**
 * POST /api/suppliers
 * Create a new supplier.
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, gstin, address } = req.body;

    const supplier = await Supplier.create({
      name,
      contactPerson: contactPerson || '',
      email: email || '',
      phone: phone || '',
      gstin: gstin || '',
      address: address || {},
      shop: req.user.shop,
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/suppliers
 * List all suppliers for the shop with optional search.
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const query = { shop: req.user.shop, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Supplier.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: suppliers,
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
 * GET /api/suppliers/:id
 * Get a single supplier with their linked products.
 */
const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    // Get products linked to this supplier
    const products = await Product.find({
      supplier: supplier._id,
      shop: req.user.shop,
      isActive: true,
    }).select('name sku stock sellingPrice category');

    res.json({
      success: true,
      data: {
        supplier,
        products,
        productCount: products.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/suppliers/:id
 * Update a supplier.
 */
const updateSupplier = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'contactPerson', 'email', 'phone', 'gstin', 'address'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      updates,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully.',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/suppliers/:id
 * Soft-delete a supplier.
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully.',
      data: { _id: supplier._id, name: supplier.name },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
