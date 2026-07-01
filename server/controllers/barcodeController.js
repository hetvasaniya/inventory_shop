const Product = require('../models/Product');
const {
  generateBarcodeBuffer,
  generateBarcodeBase64,
} = require('../utils/generateBarcode');
const { generateStickerPDF } = require('../utils/generatePDF');

/**
 * GET /api/barcodes/product/:id
 * Return barcode image as PNG.
 */
const getProductBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const barcodeBuffer = await generateBarcodeBuffer(product.barcode);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="barcode-${product.sku}.png"`
    );

    return res.send(barcodeBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/barcodes/stickers
 */
const generateStickers = async (req, res, next) => {
  try {
    const { products = [] } = req.body;

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one product.',
      });
    }

    const ids = products.map((p) => p.productId);

    const dbProducts = await Product.find({
      _id: { $in: ids },
      shop: req.user.shop,
    });

    if (dbProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Products not found.',
      });
    }

    const map = {};

    dbProducts.forEach((p) => {
      map[p._id.toString()] = p;
    });

    const stickers = [];

    for (const item of products) {
      const product = map[item.productId];

      if (!product) continue;

      const quantity = item.quantity || 1;

      for (let i = 0; i < quantity; i++) {
        stickers.push({
          name: product.name,
          barcode: product.barcode,
          sellingPrice: product.sellingPrice,
        });
      }
    }

    const pdfBuffer = await generateStickerPDF(stickers, 1);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="barcode-stickers.pdf"'
    );

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/barcodes/product/:id/base64
 */
const getProductBarcodeBase64 = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      shop: req.user.shop,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const image = await generateBarcodeBase64(product.barcode);

    return res.json({
      success: true,
      data: {
        barcode: product.barcode,
        image,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProductBarcode,
  generateStickers,
  getProductBarcodeBase64,
};