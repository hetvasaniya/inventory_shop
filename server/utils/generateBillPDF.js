const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a shopping mart / POS thermal receipt (80mm small size) invoice PDF.
 *
 * @param {object} bill - The bill document (populated)
 * @param {object} shop - The shop document
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateBillPDF = async (bill, shop = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 80mm thermal receipt width in points: ~226.77 pt (3.15 inches)
      const pageWidth = 226.77;
      const leftMargin = 10;
      const rightMargin = 10;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 206.77 pt
      const rightEdge = leftMargin + contentWidth;

      // Estimate total height dynamically so the receipt is a continuous thermal slip
      const itemsCount = bill.items?.length || 1;
      const estimatedHeight = Math.max(
        380,
        340 +
          itemsCount * 28 +
          (bill.discount > 0 ? 14 : 0) +
          (bill.paymentDetails ? 24 : 0) +
          (bill.customer && bill.customer.name !== 'Walk-in Customer' ? 24 : 0)
      );

      const doc = new PDFDocument({
        size: [pageWidth, Math.ceil(estimatedHeight)],
        margins: { top: 12, bottom: 14, left: leftMargin, right: rightMargin },
        autoFirstPage: true,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const drawDashedLine = (y) => {
        doc
          .save()
          .strokeColor('#666666')
          .lineWidth(0.6)
          .dash(2.5, { space: 2 })
          .moveTo(leftMargin, y)
          .lineTo(rightEdge, y)
          .stroke()
          .undash()
          .restore();
      };

      const drawSolidLine = (y, width = 0.8) => {
        doc
          .save()
          .strokeColor('#222222')
          .lineWidth(width)
          .moveTo(leftMargin, y)
          .lineTo(rightEdge, y)
          .stroke()
          .restore();
      };

      let curY = 12;

      // ── 1. Shop Header ──────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#000000')
        .text(shop.shopName || 'BizGrow Supermarket', leftMargin, curY, {
          width: contentWidth,
          align: 'center',
        });
      curY = doc.y + 2;

      doc.font('Helvetica').fontSize(7).fillColor('#333333');
      if (shop.address) {
        const addr = [shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
          .filter(Boolean)
          .join(', ');
        if (addr) {
          doc.text(addr, leftMargin, curY, { width: contentWidth, align: 'center' });
          curY = doc.y + 1;
        }
      }

      if (shop.phone) {
        doc.text(`Phone: ${shop.phone}`, leftMargin, curY, { width: contentWidth, align: 'center' });
        curY = doc.y + 1;
      }
      if (shop.gstin) {
        doc.text(`GSTIN: ${shop.gstin}`, leftMargin, curY, { width: contentWidth, align: 'center' });
        curY = doc.y + 1;
      }

      curY += 3;
      drawDashedLine(curY);
      curY += 5;

      // ── 2. Invoice Meta ─────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('TAX INVOICE / RETAIL BILL', leftMargin, curY, {
          width: contentWidth,
          align: 'center',
        });
      curY = doc.y + 4;

      const billDate = new Date(bill.createdAt || Date.now()).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
      doc.text(`Bill No: ${bill.billNumber}`, leftMargin, curY, { width: 110 });
      doc.font('Helvetica').fontSize(7).fillColor('#333333');
      doc.text(billDate, leftMargin + 100, curY, { width: contentWidth - 100, align: 'right' });
      curY += 10;

      const paymentMethod = (bill.paymentMethod || 'CASH').toUpperCase();
      doc.text(`Payment: ${paymentMethod}`, leftMargin, curY, { width: 110 });
      curY += 10;

      if (bill.customer && bill.customer.name && bill.customer.name !== 'Walk-in Customer') {
        doc.font('Helvetica').fontSize(7).fillColor('#333333');
        const custInfo = `Customer: ${bill.customer.name}${bill.customer.phone ? ` (${bill.customer.phone})` : ''}`;
        doc.text(custInfo, leftMargin, curY, { width: contentWidth });
        curY = doc.y + 2;
      }

      curY += 2;
      drawDashedLine(curY);
      curY += 5;

      // ── 3. Table Header ─────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
      doc.text('Item Description', leftMargin, curY, { width: 110 });
      doc.text('Qty', leftMargin + 105, curY, { width: 25, align: 'center' });
      doc.text('Rate', leftMargin + 130, curY, { width: 35, align: 'right' });
      doc.text('Amount', leftMargin + 165, curY, { width: 41, align: 'right' });
      curY = doc.y + 2;

      drawDashedLine(curY);
      curY += 4;

      // ── 4. Item Rows ────────────────────────────────────────────
      let totalItemsQty = 0;

      bill.items.forEach((item, index) => {
        const qty = item.quantity || 1;
        totalItemsQty += qty;

        // Line 1: Item Index & Name
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111');
        const itemName = `${index + 1}. ${item.name || 'Item'}`;
        doc.text(itemName, leftMargin, curY, { width: contentWidth });
        curY = doc.y + 1;

        // Line 2: Qty x Rate (GST %) and Item Total Amount
        doc.font('Helvetica').fontSize(7).fillColor('#444444');
        const rateText = `   ${qty} x Rs. ${Number(item.priceAtSale || 0).toFixed(2)}${item.gstRate ? ` (GST ${item.gstRate}%)` : ''}`;
        doc.text(rateText, leftMargin, curY, { width: 135 });

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
        const amountText = `Rs. ${Number(item.itemTotal || 0).toFixed(2)}`;
        doc.text(amountText, leftMargin + 135, curY, { width: 71, align: 'right' });
        curY = doc.y + 3;
      });

      drawDashedLine(curY);
      curY += 4;

      // ── 5. Totals & Tax Summary ─────────────────────────────────
      doc.font('Helvetica').fontSize(7.5).fillColor('#333333');

      // Total Items / Qty count
      doc.text(`Total Items: ${bill.items.length} (Qty: ${totalItemsQty})`, leftMargin, curY, { width: 110 });
      curY += 10;

      // Subtotal
      doc.text('Subtotal (Taxable):', leftMargin + 30, curY, { width: 90 });
      doc.text(`Rs. ${Number(bill.subtotal || 0).toFixed(2)}`, leftMargin + 120, curY, {
        width: 86,
        align: 'right',
      });
      curY += 10;

      // CGST
      if (bill.totalCgst > 0) {
        doc.text('CGST:', leftMargin + 30, curY, { width: 90 });
        doc.text(`Rs. ${Number(bill.totalCgst || 0).toFixed(2)}`, leftMargin + 120, curY, {
          width: 86,
          align: 'right',
        });
        curY += 10;
      }

      // SGST
      if (bill.totalSgst > 0) {
        doc.text('SGST:', leftMargin + 30, curY, { width: 90 });
        doc.text(`Rs. ${Number(bill.totalSgst || 0).toFixed(2)}`, leftMargin + 120, curY, {
          width: 86,
          align: 'right',
        });
        curY += 10;
      }

      // Discount
      if (bill.discount > 0) {
        doc.text('Discount:', leftMargin + 30, curY, { width: 90 });
        doc.text(`-Rs. ${Number(bill.discount || 0).toFixed(2)}`, leftMargin + 120, curY, {
          width: 86,
          align: 'right',
        });
        curY += 10;

        if (bill.couponCode) {
          doc.fontSize(6.5).text(`(Coupon: ${bill.couponCode})`, leftMargin + 30, curY, { width: 150 });
          curY += 9;
        }
      }

      curY += 2;
      drawSolidLine(curY, 1);
      curY += 4;

      // Grand Total
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000');
      doc.text('GRAND TOTAL:', leftMargin, curY, { width: 100 });
      doc.text(`Rs. ${Number(bill.grandTotal || 0).toFixed(2)}`, leftMargin + 100, curY, {
        width: 106,
        align: 'right',
      });
      curY = doc.y + 3;

      drawSolidLine(curY, 1);
      curY += 4;

      // Cash Tendered & Change
      if (bill.paymentDetails && bill.paymentDetails.amountPaid != null) {
        doc.font('Helvetica').fontSize(7).fillColor('#333333');
        const paid = Number(bill.paymentDetails.amountPaid || 0);
        const change = Number(bill.paymentDetails.change || 0);

        doc.text(`Amount Paid: Rs. ${paid.toFixed(2)}`, leftMargin, curY, { width: 100 });
        doc.text(`Change: Rs. ${change.toFixed(2)}`, leftMargin + 100, curY, { width: 106, align: 'right' });
        curY = doc.y + 3;

        drawDashedLine(curY);
        curY += 4;
      }

      // ── 6. QR Code ──────────────────────────────────────────────
      try {
        const qrData = JSON.stringify({
          bill: bill.billNumber,
          total: bill.grandTotal,
          date: bill.createdAt,
          shop: shop.shopName,
          gstin: shop.gstin,
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
          width: 60,
          margin: 0,
        });

        const qrX = leftMargin + (contentWidth - 60) / 2;
        doc.image(qrBuffer, qrX, curY, { width: 60, height: 60 });
        curY += 62;

        doc.font('Helvetica').fontSize(6.5).fillColor('#666666').text('Scan to verify bill', leftMargin, curY, {
          width: contentWidth,
          align: 'center',
        });
        curY = doc.y + 4;
      } catch (qrErr) {
        // Non-critical, skip if QR generation fails
      }

      // ── 7. Footer ───────────────────────────────────────────────
      curY += 2;
      drawDashedLine(curY);
      curY += 4;

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#222222')
        .text('*** THANK YOU! VISIT AGAIN ***', leftMargin, curY, {
          width: contentWidth,
          align: 'center',
        });
      curY = doc.y + 2;

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#777777')
        .text('Computer Generated Tax Invoice', leftMargin, curY, {
          width: contentWidth,
          align: 'center',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateBillPDF };
