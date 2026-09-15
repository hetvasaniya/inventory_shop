import { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Divider,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Print,
  PictureAsPdf,
  WhatsApp,
  ContentCopy,
  Close,
  ShoppingCart,
  Storefront,
  LocalShipping,
  CheckCircle,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { usePurchaseOrderPdf } from '../hooks/usePurchaseOrders';
import toast from 'react-hot-toast';

export default function PurchaseOrderPreviewModal({
  open,
  onClose,
  poData, // Either a full PO from DB or a draft PO object
  isDraft = false,
}) {
  const { shop, user } = useAuthStore();
  const printAreaRef = useRef(null);
  const downloadPdfMutation = usePurchaseOrderPdf();

  if (!poData) return null;

  const supplier = poData.supplier || {};
  const items = poData.items || [];
  const poNumber = poData.poNumber || 'DRAFT-PO';
  const orderDate = poData.orderDate
    ? new Date(poData.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const expectedDeliveryDate = poData.expectedDeliveryDate
    ? new Date(poData.expectedDeliveryDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const totalQuantity = items.reduce(
    (acc, i) => acc + (parseInt(i.orderQty, 10) || 0),
    0
  );

  const subtotal =
    poData.subtotal !== undefined
      ? poData.subtotal
      : items.reduce(
          (acc, i) =>
            acc +
            (parseInt(i.orderQty, 10) || 0) * (parseFloat(i.purchasePrice) || 0),
          0
        );

  const gstTotal =
    poData.gstTotal !== undefined
      ? poData.gstTotal
      : items.reduce((acc, i) => {
          const base =
            (parseInt(i.orderQty, 10) || 0) * (parseFloat(i.purchasePrice) || 0);
          return acc + (base * (parseFloat(i.gstRate) || 0)) / 100;
        }, 0);

  const deliveryCharges = parseFloat(poData.deliveryCharges) || 0;
  const grandTotal =
    poData.grandTotal !== undefined
      ? poData.grandTotal
      : subtotal + gstTotal + deliveryCharges;

  // Handle Browser Print
  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 10px;
              font-size: 12px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .header-title {
              font-size: 22px;
              font-weight: 800;
              color: #0284c7;
              text-align: right;
              margin: 0;
            }
            .shop-name {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .meta-text {
              font-size: 11px;
              color: #475569;
              margin: 2px 0;
            }
            .cards-container {
              display: flex;
              gap: 15px;
              margin-bottom: 16px;
            }
            .card {
              flex: 1;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background-color: #f8fafc;
              padding: 10px 12px;
            }
            .card-title {
              font-size: 11px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              margin-bottom: 6px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
            }
            .party-name {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            table.items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            table.items-table th {
              background-color: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              padding: 8px 6px;
              text-align: left;
            }
            table.items-table th.center, table.items-table td.center {
              text-align: center;
            }
            table.items-table th.right, table.items-table td.right {
              text-align: right;
            }
            table.items-table td {
              border-bottom: 1px solid #e2e8f0;
              padding: 8px 6px;
              font-size: 11.5px;
            }
            table.items-table tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .qty-badge {
              font-weight: 800;
              color: #0284c7;
              font-size: 12px;
            }
            .summary-container {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 20px;
            }
            .notes-box {
              flex: 1.2;
              background-color: #fffbeb;
              border: 1px solid #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 6px;
              padding: 10px 12px;
            }
            .totals-table {
              flex: 0.9;
              width: 100%;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 4px 6px;
              font-size: 11.5px;
            }
            .totals-table td.val {
              text-align: right;
              font-weight: 600;
            }
            .totals-table tr.grand-total td {
              font-size: 15px;
              font-weight: 800;
              color: #0284c7;
              border-top: 2px solid #cbd5e1;
              padding-top: 6px;
            }
            .footer-sign {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top; width: 60%;">
                <div class="shop-name">${shop?.shopName || 'BizGrow Store'}</div>
                <div class="meta-text">${shop?.address?.street ? `${shop.address.street}, ` : ''}${shop?.address?.city || ''} ${shop?.address?.state || ''} ${shop?.address?.pincode || ''}</div>
                ${shop?.phone ? `<div class="meta-text">Phone: ${shop.phone}</div>` : ''}
                ${shop?.email ? `<div class="meta-text">Email: ${shop.email}</div>` : ''}
                ${shop?.gstin ? `<div class="meta-text">GSTIN: ${shop.gstin}</div>` : ''}
              </td>
              <td style="vertical-align: top; text-align: right; width: 40%;">
                <h1 class="header-title">PURCHASE ORDER</h1>
                <div class="meta-text" style="font-weight: 700; color: #0f172a; font-size: 12px;">PO #: ${poNumber}</div>
                <div class="meta-text">Date: ${orderDate}</div>
                ${expectedDeliveryDate ? `<div class="meta-text">Expected Delivery: ${expectedDeliveryDate}</div>` : ''}
                <div class="meta-text">Status: <strong>${(poData.status || 'Pending').toUpperCase()}</strong></div>
              </td>
            </tr>
          </table>

          <div class="cards-container">
            <div class="card">
              <div class="card-title">Vendor / Supplier Details</div>
              <div class="party-name">${supplier.name || 'N/A'}</div>
              ${supplier.contactPerson ? `<div class="meta-text">Contact: ${supplier.contactPerson}</div>` : ''}
              ${supplier.phone ? `<div class="meta-text">Phone: ${supplier.phone}</div>` : ''}
              ${supplier.email ? `<div class="meta-text">Email: ${supplier.email}</div>` : ''}
              ${supplier.gstin ? `<div class="meta-text">GSTIN: ${supplier.gstin}</div>` : ''}
              ${supplier.address ? `<div class="meta-text">${typeof supplier.address === 'string' ? supplier.address : [supplier.address.street, supplier.address.city, supplier.address.state].filter(Boolean).join(', ')}</div>` : ''}
            </div>

            <div class="card">
              <div class="card-title">Ship To / Store Location</div>
              <div class="party-name">${shop?.shopName || 'Store Location'}</div>
              <div class="meta-text">${shop?.address?.street ? `${shop.address.street}, ` : ''}${shop?.address?.city || ''} ${shop?.address?.state || ''} ${shop?.address?.pincode || ''}</div>
              ${shop?.phone ? `<div class="meta-text">Phone: ${shop.phone}</div>` : ''}
              <div class="meta-text">Authorized Order By: ${poData.createdBy?.name || user?.name || 'Shop Admin'}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Item Description</th>
                <th class="center" style="width: 80px;">Order Qty</th>
                <th class="center" style="width: 50px;">Unit</th>
                <th class="right" style="width: 85px;">Unit Rate</th>
                <th class="right" style="width: 60px;">GST %</th>
                <th class="right" style="width: 90px;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((item, idx) => {
                  const qty = item.orderQty || 1;
                  const price = item.purchasePrice || 0;
                  const gst = item.gstRate || 0;
                  const lineTotal =
                    item.totalAmount ||
                    qty * price + (qty * price * gst) / 100;
                  return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.sku ? `<span style="color: #64748b; font-size: 10.5px;"> (SKU: ${item.sku})</span>` : ''}
                    </td>
                    <td class="center"><span class="qty-badge">${qty}</span></td>
                    <td class="center" style="color: #64748b;">${item.unit || 'pcs'}</td>
                    <td class="right">₹${Number(price).toFixed(2)}</td>
                    <td class="right">${gst}%</td>
                    <td class="right" style="font-weight: 700;">₹${Number(lineTotal).toFixed(2)}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="notes-box">
              <strong style="color: #92400e; font-size: 11px;">ORDER NOTES / INSTRUCTIONS:</strong>
              <div style="color: #78350f; font-size: 11.5px; margin-top: 4px;">
                ${poData.notes || 'Please supply the items listed above with proper invoice/delivery challan mentioning the PO number.'}
              </div>
            </div>

            <table class="totals-table">
              <tr>
                <td style="color: #475569;">Total Items / Products:</td>
                <td class="val">${items.length}</td>
              </tr>
              <tr>
                <td style="color: #475569;">Total Units to Order:</td>
                <td class="val" style="color: #0284c7; font-weight: 800;">${totalQuantity} units</td>
              </tr>
              <tr>
                <td style="color: #475569;">Subtotal (Pre-tax):</td>
                <td class="val">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #475569;">GST / Tax Amount:</td>
                <td class="val">₹${gstTotal.toFixed(2)}</td>
              </tr>
              ${
                deliveryCharges > 0
                  ? `
                <tr>
                  <td style="color: #475569;">Delivery Charges:</td>
                  <td class="val">₹${deliveryCharges.toFixed(2)}</td>
                </tr>
              `
                  : ''
              }
              <tr class="grand-total">
                <td>Grand Total:</td>
                <td class="val">₹${grandTotal.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer-sign">
            <div>Prepared By: <strong>${poData.createdBy?.name || user?.name || shop?.shopName || 'Store Admin'}</strong></div>
            <div>Authorized Signature: _______________________</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Trigger print automatically after load
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  // Handle Download Official PDF
  const handleDownloadPDF = () => {
    if (poData._id && !isDraft) {
      downloadPdfMutation.mutate({ id: poData._id, poNumber });
    } else {
      // For draft, prompt browser print / save as PDF
      handlePrint();
      toast.info('Select "Save as PDF" in the print dialog to save draft PO');
    }
  };

  // Generate WhatsApp Message Text with Items & Quantities
  const generateOrderMessage = () => {
    let msg = `*PURCHASE ORDER - ${poNumber}*\n`;
    msg += `*From:* ${shop?.shopName || 'BizGrow Store'}\n`;
    msg += `*Supplier:* ${supplier.name || 'Vendor'}\n`;
    msg += `*Date:* ${orderDate}\n`;
    if (expectedDeliveryDate) msg += `*Expected Delivery:* ${expectedDeliveryDate}\n`;
    msg += `\n*ORDERED ITEMS LIST & QUANTITIES:*\n`;
    msg += `─────────────────────────\n`;

    items.forEach((item, index) => {
      const qty = item.orderQty || 1;
      const unit = item.unit || 'pcs';
      const price = item.purchasePrice ? ` @ ₹${Number(item.purchasePrice).toFixed(2)}` : '';
      msg += `${index + 1}. *${item.name}* ${item.sku ? `(${item.sku})` : ''}\n`;
      msg += `   👉 Quantity: *${qty} ${unit}*${price}\n`;
    });

    msg += `─────────────────────────\n`;
    msg += `*Total Products:* ${items.length}\n`;
    msg += `*Total Units:* ${totalQuantity}\n`;
    msg += `*Est. Grand Total:* ₹${grandTotal.toFixed(2)}\n`;

    if (poData.notes) {
      msg += `\n*Notes/Instructions:* ${poData.notes}\n`;
    }

    msg += `\nPlease confirm order receipt and expected dispatch. Thank you!`;
    return msg;
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateOrderMessage());
    const phone = supplier.phone ? supplier.phone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;

    window.open(url, '_blank');
  };

  // Copy Order Summary to Clipboard
  const handleCopyText = () => {
    const text = generateOrderMessage();
    navigator.clipboard.writeText(text);
    toast.success('Order items list copied to clipboard!');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* Modal Action Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1.5,
          px: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <ShoppingCart color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Purchase Order Preview & Print
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isDraft ? 'Draft Preview — Ready to print or share' : `PO Number: ${poNumber}`}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Print Purchase Order">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            >
              Print
            </Button>
          </Tooltip>

          <Tooltip title="Download PDF File">
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={handleDownloadPDF}
              disabled={downloadPdfMutation.isPending}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            >
              {downloadPdfMutation.isPending ? 'Generating...' : 'PDF'}
            </Button>
          </Tooltip>

          <Tooltip title="Share Order with Supplier on WhatsApp">
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<WhatsApp />}
              onClick={handleWhatsAppShare}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            >
              WhatsApp
            </Button>
          </Tooltip>

          <Tooltip title="Copy Order Items List">
            <IconButton size="small" onClick={handleCopyText} color="primary">
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* Document Preview Sheet (Styled as A4 Document) */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
        <Paper
          ref={printAreaRef}
          elevation={3}
          sx={{
            p: { xs: 2.5, sm: 4 },
            bgcolor: '#ffffff',
            color: '#1e293b',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            maxWidth: 820,
            mx: 'auto',
          }}
        >
          {/* Header Row: Shop Details + PO Badge */}
          <Grid container spacing={2} sx={{ mb: 2.5, pb: 2, borderBottom: '2px solid #0284c7' }}>
            <Grid item xs={12} sm={7}>
              <Typography variant="h5" fontWeight={900} color="#0f172a" gutterBottom>
                {shop?.shopName || 'BizGrow Store'}
              </Typography>
              {shop?.address && (
                <Typography variant="body2" color="#475569">
                  {[shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              )}
              {shop?.phone && (
                <Typography variant="caption" color="#475569" display="block">
                  📞 Phone: {shop.phone}
                </Typography>
              )}
              {shop?.email && (
                <Typography variant="caption" color="#475569" display="block">
                  ✉️ Email: {shop.email}
                </Typography>
              )}
              {shop?.gstin && (
                <Typography variant="caption" color="#475569" display="block">
                  GSTIN: <strong>{shop.gstin}</strong>
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} sm={5} textAlign={{ xs: 'left', sm: 'right' }}>
              <Typography variant="h5" fontWeight={900} color="#0284c7" letterSpacing={0.5}>
                PURCHASE ORDER
              </Typography>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mt={0.5}>
                PO #: {poNumber}
              </Typography>
              <Typography variant="caption" color="#475569" display="block">
                Order Date: <strong>{orderDate}</strong>
              </Typography>
              {expectedDeliveryDate && (
                <Typography variant="caption" color="#475569" display="block">
                  Expected Delivery: <strong>{expectedDeliveryDate}</strong>
                </Typography>
              )}
              <Box mt={0.5}>
                <Chip
                  label={poData.status || (isDraft ? 'DRAFT' : 'PENDING')}
                  color={poData.status === 'Received' ? 'success' : 'primary'}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Supplier Vendor Card & Ship-To Card */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Vendor Card */}
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  borderColor: '#cbd5e1',
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="#0284c7"
                  display="block"
                  gutterBottom
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Vendor / Supplier Details
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  {supplier.name || 'N/A'}
                </Typography>
                {supplier.contactPerson && (
                  <Typography variant="body2" color="#475569">
                    Contact: <strong>{supplier.contactPerson}</strong>
                  </Typography>
                )}
                {supplier.phone && (
                  <Typography variant="body2" color="#475569">
                    📞 {supplier.phone}
                  </Typography>
                )}
                {supplier.email && (
                  <Typography variant="body2" color="#475569">
                    ✉️ {supplier.email}
                  </Typography>
                )}
                {supplier.gstin && (
                  <Typography variant="caption" color="#64748b" display="block">
                    GSTIN: <strong>{supplier.gstin}</strong>
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Ship-To Card */}
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  borderColor: '#cbd5e1',
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="#0284c7"
                  display="block"
                  gutterBottom
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Delivery / Ship To
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  {shop?.shopName || 'Store Location'}
                </Typography>
                {shop?.address && (
                  <Typography variant="body2" color="#475569">
                    {[shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </Typography>
                )}
                {shop?.phone && (
                  <Typography variant="body2" color="#475569">
                    📞 {shop.phone}
                  </Typography>
                )}
                <Typography variant="caption" color="#64748b" display="block" mt={0.5}>
                  Order Prepared By: <strong>{poData.createdBy?.name || user?.name || 'Shop Admin'}</strong>
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Items & Quantities Table */}
          <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={1}>
            Order Items & Required Quantities
          </Typography>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderColor: '#cbd5e1', borderRadius: 1.5, mb: 3 }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: '#0f172a' }}>
                <TableRow>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 800, width: 40 }}>#</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 800 }}>Item Name / SKU</TableCell>
                  <TableCell align="center" sx={{ color: '#ffffff', fontWeight: 800, width: 110 }}>
                    Order Quantity
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#ffffff', fontWeight: 800, width: 70 }}>
                    Unit
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#ffffff', fontWeight: 800, width: 100 }}>
                    Unit Rate (₹)
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#ffffff', fontWeight: 800, width: 70 }}>
                    GST %
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#ffffff', fontWeight: 800, width: 110 }}>
                    Total (₹)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#64748b' }}>
                      No items in this purchase order.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const qty = item.orderQty || 1;
                    const price = item.purchasePrice || 0;
                    const gst = item.gstRate || 0;
                    const lineTotal =
                      item.totalAmount ||
                      qty * price + (qty * price * gst) / 100;

                    return (
                      <TableRow
                        key={item._id || item.productId || index}
                        sx={{
                          bgcolor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                          '&:hover': { bgcolor: '#f1f5f9' },
                        }}
                      >
                        <TableCell sx={{ color: '#64748b' }}>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {item.name}
                          </Typography>
                          {item.sku && (
                            <Typography variant="caption" color="#64748b">
                              SKU: {item.sku}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'inline-block',
                              bgcolor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 800,
                              px: 1.5,
                              py: 0.3,
                              borderRadius: 1,
                              fontSize: '0.9rem',
                            }}
                          >
                            {qty}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#475569', fontWeight: 600 }}>
                          {item.unit || 'pcs'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#0f172a' }}>
                          ₹{Number(price).toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#475569' }}>
                          {gst}%
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          ₹{Number(lineTotal).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary & Notes Section */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Notes */}
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: '#fffbeb',
                  borderColor: '#fef3c7',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={800} color="#92400e" display="block" gutterBottom>
                  ORDER NOTES & SUPPLIER INSTRUCTIONS
                </Typography>
                <Typography variant="body2" color="#78350f" sx={{ whiteSpace: 'pre-wrap' }}>
                  {poData.notes ||
                    'Please supply items according to the quantities listed. Attach delivery challan and invoice referencing this PO number.'}
                </Typography>
              </Paper>
            </Grid>

            {/* Totals Breakdown */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="#475569">
                    Total Products:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {items.length} item(s)
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="#475569">
                    Total Quantity to Deliver:
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#0284c7">
                    {totalQuantity} units
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="#475569">
                    Subtotal (Pre-tax):
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    ₹{subtotal.toFixed(2)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="#475569">
                    GST / Tax Amount:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    ₹{gstTotal.toFixed(2)}
                  </Typography>
                </Box>

                {deliveryCharges > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="#475569">
                      Delivery Charges:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      ₹{deliveryCharges.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1.5, borderColor: '#cbd5e1' }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    Grand Total:
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color="#0284c7">
                    ₹{grandTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Authorization Footer */}
          <Box
            sx={{
              pt: 2,
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="#64748b" display="block">
                Prepared by: <strong>{poData.createdBy?.name || user?.name || shop?.shopName || 'Store Admin'}</strong>
              </Typography>
              <Typography variant="caption" color="#94a3b8">
                Generated via BizGrow Smart Inventory
              </Typography>
            </Box>

            <Box textAlign="right">
              <Typography variant="caption" color="#64748b" display="block">
                Authorized Signatory: ________________________
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<ContentCopy />}
          onClick={handleCopyText}
        >
          Copy Order Text
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<WhatsApp />}
          onClick={handleWhatsAppShare}
        >
          Send via WhatsApp
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Print />}
          onClick={handlePrint}
        >
          Print Purchase Order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
