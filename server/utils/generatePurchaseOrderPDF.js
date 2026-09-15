const PDFDocument = require('pdfkit');

/**
 * Generate a professional Purchase Order PDF document for suppliers.
 *
 * @param {object} po - The PurchaseOrder document (populated with supplier and createdBy)
 * @param {object} shop - The Shop document
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePurchaseOrderPDF = async (po, shop) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 523; // A4 usable width (595 - 72)
      const leftMargin = 36;
      const rightEdge = leftMargin + pageWidth;

      // ── Header: Shop Info (Left) & Document Title (Right) ───────────
      const headerTop = 36;

      // Left: Shop Name & Details
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#1E293B')
        .text(shop?.shopName || 'BizGrow Store', leftMargin, headerTop);

      doc.font('Helvetica').fontSize(8.5).fillColor('#64748B');
      let shopY = headerTop + 20;

      if (shop?.address) {
        const addr = [shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
          .filter(Boolean)
          .join(', ');
        if (addr) {
          doc.text(addr, leftMargin, shopY, { width: 280 });
          shopY += 13;
        }
      }
      if (shop?.phone) {
        doc.text(`Phone: ${shop.phone}`, leftMargin, shopY);
        shopY += 12;
      }
      if (shop?.email) {
        doc.text(`Email: ${shop.email}`, leftMargin, shopY);
        shopY += 12;
      }
      if (shop?.gstin) {
        doc.text(`GSTIN: ${shop.gstin}`, leftMargin, shopY);
        shopY += 12;
      }

      // Right: "PURCHASE ORDER" Badge & PO Meta
      const rightColX = 350;
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#0284C7')
        .text('PURCHASE ORDER', rightColX, headerTop, { align: 'right', width: 173 });

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1E293B');
      doc.text(`PO #: ${po.poNumber}`, rightColX, headerTop + 24, { align: 'right', width: 173 });

      const formattedOrderDate = new Date(po.orderDate || po.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
      doc.text(`Date: ${formattedOrderDate}`, rightColX, headerTop + 38, { align: 'right', width: 173 });

      if (po.expectedDeliveryDate) {
        const formattedDeliveryDate = new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        doc.text(`Expected Delivery: ${formattedDeliveryDate}`, rightColX, headerTop + 50, { align: 'right', width: 173 });
      }

      doc.text(`Status: ${(po.status || 'Pending').toUpperCase()}`, rightColX, headerTop + 62, {
        align: 'right',
        width: 173,
      });

      // Divider line
      const lineY = Math.max(shopY, headerTop + 76) + 10;
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .moveTo(leftMargin, lineY)
        .lineTo(rightEdge, lineY)
        .stroke();

      // ── Two Column Address Cards: Vendor (Supplier) & Ship To (Store) ──
      const cardsTop = lineY + 12;
      const cardWidth = 252;
      const cardHeight = 85;

      // Supplier / Vendor Card (Left)
      doc
        .roundedRect(leftMargin, cardsTop, cardWidth, cardHeight, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0284C7')
        .text('VENDOR / SUPPLIER DETAILS', leftMargin + 10, cardsTop + 8);

      const supplierName = po.supplier?.name || 'N/A';
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text(supplierName, leftMargin + 10, cardsTop + 22);

      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      let supY = cardsTop + 36;
      if (po.supplier?.contactPerson) {
        doc.text(`Contact: ${po.supplier.contactPerson}`, leftMargin + 10, supY);
        supY += 11;
      }
      if (po.supplier?.phone) {
        doc.text(`Phone: ${po.supplier.phone}`, leftMargin + 10, supY);
        supY += 11;
      }
      if (po.supplier?.email) {
        doc.text(`Email: ${po.supplier.email}`, leftMargin + 10, supY);
        supY += 11;
      }
      if (po.supplier?.gstin) {
        doc.text(`GSTIN: ${po.supplier.gstin}`, leftMargin + 10, supY);
      }

      // Ship To / Delivery Card (Right)
      const rightCardX = leftMargin + cardWidth + 19;
      doc
        .roundedRect(rightCardX, cardsTop, cardWidth, cardHeight, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0284C7')
        .text('DELIVERY / SHIP TO', rightCardX + 10, cardsTop + 8);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text(shop?.shopName || 'Store Location', rightCardX + 10, cardsTop + 22);

      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      let shipY = cardsTop + 36;
      if (shop?.address) {
        const addr = [shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
          .filter(Boolean)
          .join(', ');
        if (addr) {
          doc.text(addr, rightCardX + 10, shipY, { width: 230 });
          shipY += 18;
        }
      }
      if (shop?.phone) {
        doc.text(`Phone: ${shop.phone}`, rightCardX + 10, shipY);
        shipY += 11;
      }
      if (po.createdBy?.name) {
        doc.text(`Created By: ${po.createdBy.name}`, rightCardX + 10, shipY);
      }

      // ── Order Items Table ───────────────────────────────────────
      const tableTop = cardsTop + cardHeight + 16;
      const colWidths = {
        sno: 25,
        item: 210,
        qty: 55,
        unit: 45,
        price: 60,
        gst: 45,
        total: 83,
      };

      // Table Header Bar
      doc.rect(leftMargin, tableTop, pageWidth, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);

      let colX = leftMargin + 6;
      doc.text('#', colX, tableTop + 6, { width: colWidths.sno });
      colX += colWidths.sno;
      doc.text('ITEM DESCRIPTION', colX, tableTop + 6, { width: colWidths.item });
      colX += colWidths.item;
      doc.text('QTY NEEDED', colX, tableTop + 6, { width: colWidths.qty, align: 'center' });
      colX += colWidths.qty;
      doc.text('UNIT', colX, tableTop + 6, { width: colWidths.unit, align: 'center' });
      colX += colWidths.unit;
      doc.text('UNIT RATE', colX, tableTop + 6, { width: colWidths.price, align: 'right' });
      colX += colWidths.price;
      doc.text('GST %', colX, tableTop + 6, { width: colWidths.gst, align: 'right' });
      colX += colWidths.gst;
      doc.text('TOTAL (Rs.)', colX, tableTop + 6, { width: colWidths.total, align: 'right' });

      // Table Rows
      let rowY = tableTop + 24;
      let totalQtyCount = 0;

      po.items.forEach((item, index) => {
        // Handle multi-page overflow
        if (rowY > 710) {
          doc.addPage();
          rowY = 40;
          // Re-draw header on new page
          doc.rect(leftMargin, rowY, pageWidth, 20).fill('#1E293B');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
          let cx = leftMargin + 6;
          doc.text('#', cx, rowY + 5, { width: colWidths.sno });
          cx += colWidths.sno;
          doc.text('ITEM DESCRIPTION', cx, rowY + 5, { width: colWidths.item });
          cx += colWidths.item;
          doc.text('QTY NEEDED', cx, rowY + 5, { width: colWidths.qty, align: 'center' });
          cx += colWidths.qty;
          doc.text('UNIT', cx, rowY + 5, { width: colWidths.unit, align: 'center' });
          cx += colWidths.unit;
          doc.text('UNIT RATE', cx, rowY + 5, { width: colWidths.price, align: 'right' });
          cx += colWidths.price;
          doc.text('GST %', cx, rowY + 5, { width: colWidths.gst, align: 'right' });
          cx += colWidths.gst;
          doc.text('TOTAL (Rs.)', cx, rowY + 5, { width: colWidths.total, align: 'right' });
          rowY += 22;
        }

        const isEven = index % 2 === 0;
        doc.rect(leftMargin, rowY - 2, pageWidth, 20).fill(isEven ? '#F8FAFC' : '#FFFFFF');

        doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');

        let cellX = leftMargin + 6;
        doc.text(String(index + 1), cellX, rowY + 3, { width: colWidths.sno });
        cellX += colWidths.sno;

        const itemName = item.name || 'Product';
        const skuInfo = item.sku ? ` (SKU: ${item.sku})` : '';
        const fullDesc = itemName.length > 40 ? itemName.substring(0, 37) + '...' + skuInfo : itemName + skuInfo;
        doc.font('Helvetica-Bold').text(fullDesc, cellX, rowY + 3, { width: colWidths.item });
        cellX += colWidths.item;

        const orderQty = item.orderQty || 1;
        totalQtyCount += orderQty;
        doc.font('Helvetica-Bold').fillColor('#0284C7').text(String(orderQty), cellX, rowY + 3, {
          width: colWidths.qty,
          align: 'center',
        });
        cellX += colWidths.qty;

        doc.font('Helvetica').fillColor('#475569').text(item.unit || 'pcs', cellX, rowY + 3, {
          width: colWidths.unit,
          align: 'center',
        });
        cellX += colWidths.unit;

        const price = item.purchasePrice || 0;
        doc.text(`₹${price.toFixed(2)}`, cellX, rowY + 3, {
          width: colWidths.price,
          align: 'right',
        });
        cellX += colWidths.price;

        doc.text(`${item.gstRate || 0}%`, cellX, rowY + 3, {
          width: colWidths.gst,
          align: 'right',
        });
        cellX += colWidths.gst;

        const lineTotal = item.totalAmount || price * orderQty;
        doc.font('Helvetica-Bold').fillColor('#1E293B').text(`₹${lineTotal.toFixed(2)}`, cellX, rowY + 3, {
          width: colWidths.total,
          align: 'right',
        });

        rowY += 20;
      });

      // Bottom border for table
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(leftMargin, rowY).lineTo(rightEdge, rowY).stroke();

      // ── Notes & Summary Block ──────────────────────────────────
      rowY += 12;
      if (rowY > 670) {
        doc.addPage();
        rowY = 40;
      }

      const notesWidth = 270;
      const totalsWidth = 220;
      const totalsLeft = rightEdge - totalsWidth;

      // Left: Notes & Instructions
      if (po.notes) {
        doc.roundedRect(leftMargin, rowY, notesWidth, 65, 4).fillAndStroke('#FEF3C7', '#FDE68A');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400E').text('ORDER NOTES / INSTRUCTIONS:', leftMargin + 8, rowY + 8);
        doc.font('Helvetica').fontSize(8).fillColor('#78350F').text(po.notes, leftMargin + 8, rowY + 22, {
          width: notesWidth - 16,
          height: 38,
        });
      } else {
        doc.roundedRect(leftMargin, rowY, notesWidth, 55, 4).fillAndStroke('#F1F5F9', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('SUPPLIER NOTE:', leftMargin + 8, rowY + 8);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text('Please verify quantities and ensure proper packaging upon delivery. Mention PO number in delivery challan.', leftMargin + 8, rowY + 20, {
          width: notesWidth - 16,
        });
      }

      // Right: Order Totals Table
      let totY = rowY;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569');

      doc.text('Total Items:', totalsLeft, totY);
      doc.font('Helvetica-Bold').fillColor('#1E293B').text(`${po.items.length} product(s)`, totalsLeft + 110, totY, { width: 110, align: 'right' });
      totY += 13;

      doc.font('Helvetica').fillColor('#475569').text('Total Quantity:', totalsLeft, totY);
      doc.font('Helvetica-Bold').fillColor('#0284C7').text(`${totalQtyCount} units`, totalsLeft + 110, totY, { width: 110, align: 'right' });
      totY += 13;

      doc.font('Helvetica').fillColor('#475569').text('Subtotal (Pre-tax):', totalsLeft, totY);
      doc.font('Helvetica').fillColor('#1E293B').text(`₹${(po.subtotal || 0).toFixed(2)}`, totalsLeft + 110, totY, { width: 110, align: 'right' });
      totY += 13;

      doc.font('Helvetica').fillColor('#475569').text('GST / Tax:', totalsLeft, totY);
      doc.font('Helvetica').fillColor('#1E293B').text(`₹${(po.gstTotal || 0).toFixed(2)}`, totalsLeft + 110, totY, { width: 110, align: 'right' });
      totY += 13;

      if ((po.deliveryCharges || 0) > 0) {
        doc.font('Helvetica').fillColor('#475569').text('Delivery Charges:', totalsLeft, totY);
        doc.font('Helvetica').fillColor('#1E293B').text(`₹${po.deliveryCharges.toFixed(2)}`, totalsLeft + 110, totY, { width: 110, align: 'right' });
        totY += 13;
      }

      doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(totalsLeft, totY + 2).lineTo(rightEdge, totY + 2).stroke();
      totY += 6;

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0284C7').text('Grand Total:', totalsLeft, totY);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0284C7').text(`₹${(po.grandTotal || 0).toFixed(2)}`, totalsLeft + 100, totY, { width: 120, align: 'right' });

      // ── Footer / Authorization ─────────────────────────────────
      const footerY = 760;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(leftMargin, footerY - 20).lineTo(rightEdge, footerY - 20).stroke();

      // Signatory section
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Prepared by: ' + (po.createdBy?.name || shop?.shopName || 'Store Admin'), leftMargin, footerY - 10);
      doc.text('Authorized Signatory: ________________________', rightEdge - 210, footerY - 10, { align: 'right' });

      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text(
        'This is a computer-generated Purchase Order document issued by ' + (shop?.shopName || 'BizGrow') + '.',
        leftMargin,
        footerY + 12,
        { width: pageWidth, align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePurchaseOrderPDF };
