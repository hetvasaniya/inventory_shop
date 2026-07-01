const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { calculateGST } = require('./gstCalculator');

/**
 * Generate a tax-compliant bill/invoice PDF.
 *
 * @param {object} bill - The bill document (populated)
 * @param {object} shop - The shop document
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateBillPDF = async (bill, shop) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 515; // Usable width (A4 - margins)

      // ── Header ───────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(shop.shopName || 'H-Mart Store', { align: 'center' });

      doc.fontSize(9).font('Helvetica');
      if (shop.address) {
        const addr = [shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
          .filter(Boolean)
          .join(', ');
        if (addr) doc.text(addr, { align: 'center' });
      }
      if (shop.phone) doc.text(`Phone: ${shop.phone}`, { align: 'center' });
      if (shop.gstin) doc.text(`GSTIN: ${shop.gstin}`, { align: 'center' });

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // ── TAX INVOICE title ─────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(14).text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.3);

      // ── Bill details ──────────────────────────────────────
      doc.font('Helvetica').fontSize(9);
      const billDate = new Date(bill.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      doc.text(`Bill No: ${bill.billNumber}`, 40, doc.y);
      doc.text(`Date: ${billDate}`, 40, doc.y);
      doc.text(`Payment: ${bill.paymentMethod.toUpperCase()}`, 40, doc.y);

      if (bill.customer && bill.customer.name !== 'Walk-in Customer') {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Customer:', 40, doc.y);
        doc.font('Helvetica');
        doc.text(`Name: ${bill.customer.name}`);
        if (bill.customer.phone) doc.text(`Phone: ${bill.customer.phone}`);
      }

      doc.moveDown(0.5);

      // ── Items table header ────────────────────────────────
      const tableTop = doc.y;
      const colWidths = {
        sno: 30,
        item: 160,
        hsn: 55,
        qty: 35,
        rate: 60,
        gst: 45,
        amount: 70,
      };

      // Header background
      doc.rect(40, tableTop, pageWidth, 18).fill('#333333');
      doc.fill('#ffffff').font('Helvetica-Bold').fontSize(8);

      let colX = 45;
      doc.text('#', colX, tableTop + 5, { width: colWidths.sno });
      colX += colWidths.sno;
      doc.text('Item', colX, tableTop + 5, { width: colWidths.item });
      colX += colWidths.item;
      doc.text('HSN', colX, tableTop + 5, { width: colWidths.hsn });
      colX += colWidths.hsn;
      doc.text('Qty', colX, tableTop + 5, { width: colWidths.qty, align: 'right' });
      colX += colWidths.qty;
      doc.text('Rate', colX, tableTop + 5, { width: colWidths.rate, align: 'right' });
      colX += colWidths.rate;
      doc.text('GST%', colX, tableTop + 5, { width: colWidths.gst, align: 'right' });
      colX += colWidths.gst;
      doc.text('Amount', colX, tableTop + 5, { width: colWidths.amount, align: 'right' });

      doc.fill('#000000');

      // ── Items rows ────────────────────────────────────────
      let rowY = tableTop + 22;
      doc.font('Helvetica').fontSize(8);

      bill.items.forEach((item, index) => {
        // Add new page if needed
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(40, rowY - 2, pageWidth, 16).fill('#f9f9f9');
          doc.fill('#000000');
        }

        colX = 45;
        doc.text(String(index + 1), colX, rowY, { width: colWidths.sno });
        colX += colWidths.sno;

        const itemName = item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name;
        doc.text(itemName, colX, rowY, { width: colWidths.item });
        colX += colWidths.item;
        doc.text(item.hsnCode || '-', colX, rowY, { width: colWidths.hsn });
        colX += colWidths.hsn;
        doc.text(String(item.quantity), colX, rowY, { width: colWidths.qty, align: 'right' });
        colX += colWidths.qty;
        doc.text(`₹${item.priceAtSale.toFixed(2)}`, colX, rowY, {
          width: colWidths.rate,
          align: 'right',
        });
        colX += colWidths.rate;
        doc.text(`${item.gstRate}%`, colX, rowY, { width: colWidths.gst, align: 'right' });
        colX += colWidths.gst;
        doc.text(`₹${item.itemTotal.toFixed(2)}`, colX, rowY, {
          width: colWidths.amount,
          align: 'right',
        });

        rowY += 16;
      });

      // ── Table bottom line ─────────────────────────────────
      doc.moveTo(40, rowY + 2).lineTo(555, rowY + 2).stroke();

      // ── Totals ────────────────────────────────────────────
      rowY += 10;
      const totalsX = 380;
      const totalsValX = 470;

      doc.font('Helvetica').fontSize(9);
      doc.text('Subtotal:', totalsX, rowY);
      doc.text(`₹${bill.subtotal.toFixed(2)}`, totalsValX, rowY, { width: 85, align: 'right' });
      rowY += 14;

      doc.text('CGST:', totalsX, rowY);
      doc.text(`₹${bill.totalCgst.toFixed(2)}`, totalsValX, rowY, { width: 85, align: 'right' });
      rowY += 14;

      doc.text('SGST:', totalsX, rowY);
      doc.text(`₹${bill.totalSgst.toFixed(2)}`, totalsValX, rowY, { width: 85, align: 'right' });
      rowY += 14;

      if (bill.discount > 0) {
        doc.text('Discount:', totalsX, rowY);
        doc.text(`-₹${bill.discount.toFixed(2)}`, totalsValX, rowY, {
          width: 85,
          align: 'right',
        });
        rowY += 14;

        if (bill.couponCode) {
          doc.fontSize(8).text(`(Coupon: ${bill.couponCode})`, totalsX, rowY);
          rowY += 14;
        }
      }

      doc.moveTo(totalsX, rowY).lineTo(555, rowY).stroke();
      rowY += 5;

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Grand Total:', totalsX, rowY);
      doc.text(`₹${bill.grandTotal.toFixed(2)}`, totalsValX, rowY, {
        width: 85,
        align: 'right',
      });
      rowY += 20;

      // Payment details
      if (bill.paymentDetails) {
        doc.font('Helvetica').fontSize(9);
        doc.text(`Amount Paid: ₹${(bill.paymentDetails.amountPaid || 0).toFixed(2)}`, totalsX, rowY);
        rowY += 14;
        doc.text(`Change: ₹${(bill.paymentDetails.change || 0).toFixed(2)}`, totalsX, rowY);
        rowY += 20;
      }

      // ── QR Code ───────────────────────────────────────────
      try {
        const qrData = JSON.stringify({
          bill: bill.billNumber,
          total: bill.grandTotal,
          date: bill.createdAt,
          shop: shop.shopName,
          gstin: shop.gstin,
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
          width: 80,
          margin: 1,
        });

        if (rowY > 720) {
          doc.addPage();
          rowY = 50;
        }

        doc.image(qrBuffer, 40, rowY, { width: 80, height: 80 });
        doc.font('Helvetica').fontSize(7).text('Scan for bill details', 40, rowY + 82, {
          width: 80,
          align: 'center',
        });
      } catch (qrErr) {
        // QR generation is non-critical, skip if it fails
      }

      // ── Footer ────────────────────────────────────────────
      const footerY = Math.max(rowY + 100, 750);
      doc.font('Helvetica').fontSize(8);
      doc.text('Thank you for shopping with us!', 40, footerY, {
        width: pageWidth,
        align: 'center',
      });
      doc.text('This is a computer-generated invoice.', 40, footerY + 12, {
        width: pageWidth,
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateBillPDF };
