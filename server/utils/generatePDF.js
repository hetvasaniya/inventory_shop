const PDFDocument = require('pdfkit');
const { generateBarcodeBuffer } = require('./generateBarcode');

/**
 * Generate an A4 PDF with barcode stickers for products.
 *
 * Layout: 3 columns x 10 rows per page = 30 stickers per page
 * Each sticker shows: Product Name, Price, Barcode
 *
 * @param {Array} products - Array of product objects with { name, sellingPrice, barcode }
 * @param {number} quantity - Number of stickers per product (default: 1)
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateStickerPDF = (products, quantity = 1) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 15, right: 15 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // A4 dimensions in points: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = { top: 20, left: 15 };

      const cols = 3;
      const rows = 10;
      const stickerWidth = (pageWidth - 30) / cols; // ~188.43
      const stickerHeight = (pageHeight - 40) / rows; // ~80.19

      // Flatten products into sticker entries based on quantity
      const stickers = [];
      for (const product of products) {
        for (let i = 0; i < quantity; i++) {
          stickers.push(product);
        }
      }

      let stickerIndex = 0;

      for (let i = 0; i < stickers.length; i++) {
        // Start new page if needed (not on the first sticker)
        if (stickerIndex > 0 && stickerIndex % (cols * rows) === 0) {
          doc.addPage();
        }

        const posOnPage = stickerIndex % (cols * rows);
        const col = posOnPage % cols;
        const row = Math.floor(posOnPage / cols);

        const x = margin.left + col * stickerWidth;
        const y = margin.top + row * stickerHeight;

        const sticker = stickers[i];

        // Draw sticker border
        doc
          .rect(x + 2, y + 2, stickerWidth - 4, stickerHeight - 4)
          .lineWidth(0.5)
          .stroke('#cccccc');

        // Product name (truncate if too long)
        const displayName =
          sticker.name.length > 22 ? sticker.name.substring(0, 22) + '...' : sticker.name;

        doc.font('Helvetica-Bold').fontSize(8).text(displayName, x + 5, y + 5, {
          width: stickerWidth - 10,
          align: 'center',
        });

        // Price
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`₹${sticker.sellingPrice.toFixed(2)}`, x + 5, y + 17, {
            width: stickerWidth - 10,
            align: 'center',
          });

        // Barcode image
        try {
          const barcodeBuffer = generateBarcodeBuffer(sticker.barcode, {
            width: 1.5,
            height: 35,
            fontSize: 10,
            margin: 2,
          });

          const barcodeImgWidth = stickerWidth - 20;
          const barcodeImgHeight = 45;
          const barcodeX = x + (stickerWidth - barcodeImgWidth) / 2;
          const barcodeY = y + 30;

          doc.image(barcodeBuffer, barcodeX, barcodeY, {
            width: barcodeImgWidth,
            height: barcodeImgHeight,
            fit: [barcodeImgWidth, barcodeImgHeight],
            align: 'center',
          });
        } catch (barcodeErr) {
          // If barcode generation fails, print the code as text
          doc
            .font('Courier')
            .fontSize(8)
            .text(sticker.barcode, x + 5, y + 45, {
              width: stickerWidth - 10,
              align: 'center',
            });
        }

        stickerIndex++;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateStickerPDF };
