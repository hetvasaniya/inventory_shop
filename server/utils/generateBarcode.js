const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

/**
 * Generate a barcode as a PNG buffer using JsBarcode + node-canvas.
 * @param {string} value - The barcode value to encode
 * @param {object} options - JsBarcode options
 * @returns {Buffer} PNG image buffer of the barcode
 */
const generateBarcodeBuffer = (value, options = {}) => {
  const canvas = createCanvas(200, 100);

  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14,
    margin: 5,
    ...options,
  });

  return canvas.toBuffer('image/png');
};

/**
 * Generate a barcode as a base64 data URI.
 * @param {string} value - The barcode value to encode
 * @param {object} options - JsBarcode options
 * @returns {string} base64 data URI
 */
const generateBarcodeBase64 = (value, options = {}) => {
  const buffer = generateBarcodeBuffer(value, options);
  return `data:image/png;base64,${buffer.toString('base64')}`;
};

module.exports = { generateBarcodeBuffer, generateBarcodeBase64 };
