import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider, Card, CardContent
} from '@mui/material';
import { Visibility, Search, Print, WhatsApp, Email, DateRange } from '@mui/icons-material';
import { useBills, useBillPdf } from '../hooks/useBills';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BillHistoryPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const { data: billsData, isLoading } = useBills({ search, startDate, endDate });
  const getPdfMutation = useBillPdf();

  const handleOpenDetail = (bill) => {
    setSelectedBill(bill);
    setOpenDetailDialog(true);
    setEmailInput(bill.customer?.email || '');
  };

  const handleCloseDetail = () => {
    setOpenDetailDialog(false);
    setSelectedBill(null);
  };

  const handlePrint = (id) => {
    getPdfMutation.mutate(id);
  };

  const handleShareEmail = async () => {
    if (!emailInput) return;
    try {
      await api.post(`/bills/${selectedBill._id}/share/email`, { email: emailInput });
      toast.success(`Bill emailed successfully to ${emailInput}`);
    } catch (err) {
      toast.error('Failed to send email. Ensure SMTP credentials are set in .env');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedBill?.customer?.phone) {
      const phone = window.prompt('Please enter customer phone number:');
      if (!phone) return;
      selectedBill.customer.phone = phone;
    }
    try {
      const res = await api.get(`/bills/${selectedBill._id}/share/whatsapp`, {
        params: { phone: selectedBill.customer.phone }
      });
      if (res.data?.success && res.data?.data?.whatsappLink) {
        window.open(res.data.data.whatsappLink, '_blank');
      }
    } catch (err) {
      toast.error('Failed to generate WhatsApp link');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Bill History & Invoices</Typography>

      {/* Date Range & Search filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search by Bill # or Customer Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DateRange />}
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearch('');
              }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bill Number</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Customer Details</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right">Grand Total</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center">Loading bills...</TableCell></TableRow>
            ) : billsData?.data?.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No bills found.</TableCell></TableRow>
            ) : (
              billsData?.data?.map((bill) => (
                <TableRow key={bill._id}>
                  <TableCell fontWeight={600}>{bill.billNumber}</TableCell>
                  <TableCell>{new Date(bill.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{bill.customer?.name}</Typography>
                    {bill.customer?.phone && <Typography variant="caption" color="text.secondary">{bill.customer.phone}</Typography>}
                  </TableCell>
                  <TableCell align="right">{bill.items?.length || 0} items</TableCell>
                  <TableCell align="right" fontWeight={700}>₹{bill.grandTotal.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpenDetail(bill)} color="primary"><Visibility /></IconButton>
                    <IconButton onClick={() => handlePrint(bill._id)} color="secondary"><Print /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bill Details Dialog */}
      <Dialog open={openDetailDialog} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {selectedBill && (
          <>
            <DialogTitle>
              <Typography variant="h5" fontWeight={700}>Invoice Details: {selectedBill.billNumber}</Typography>
              <Typography variant="caption" color="text.secondary">
                Billed on: {new Date(selectedBill.createdAt).toLocaleString()} | Billed by: {selectedBill.billedBy?.name}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Customer Info</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedBill.customer?.name}</Typography>
                  {selectedBill.customer?.phone && <Typography variant="body2">Phone: {selectedBill.customer.phone}</Typography>}
                  {selectedBill.customer?.email && <Typography variant="body2">Email: {selectedBill.customer.email}</Typography>}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Summary</Typography>
                  <Typography variant="body2">Payment Method: Cash</Typography>
                  <Typography variant="body2">Amount Tendered: ₹{selectedBill.paymentDetails?.amountPaid?.toFixed(2)}</Typography>
                  <Typography variant="body2">Change Due: ₹{selectedBill.paymentDetails?.change?.toFixed(2)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <TableContainer sx={{ maxHeight: 300, mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Selling Price</TableCell>
                      <TableCell align="right">GST %</TableCell>
                      <TableCell align="right">CGST</TableCell>
                      <TableCell align="right">SGST</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBill.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">₹{item.priceAtSale.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.gstRate}%</TableCell>
                        <TableCell align="right">₹{item.cgst.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{item.sgst.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{item.itemTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ width: '100%', maxWidth: 300, ml: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'between', mb: 0.5 }}>
                  <Typography color="text.secondary">Subtotal (excl. Tax)</Typography>
                  <Typography>₹{selectedBill.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'between', mb: 0.5 }}>
                  <Typography color="text.secondary">Total CGST</Typography>
                  <Typography>₹{selectedBill.totalCgst.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'between', mb: 0.5 }}>
                  <Typography color="text.secondary">Total SGST</Typography>
                  <Typography>₹{selectedBill.totalSgst.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'between', mb: 0.5 }}>
                  <Typography color="text.secondary">Discount</Typography>
                  <Typography sx={{ color: 'success.main' }}>- ₹{selectedBill.discount.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'between' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">₹{selectedBill.grandTotal.toFixed(2)}</Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'between' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  placeholder="Customer Email"
                  size="small"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <Button variant="outlined" startIcon={<Email />} onClick={handleShareEmail}>Email Bill</Button>
                <Button variant="outlined" color="success" startIcon={<WhatsApp />} onClick={handleShareWhatsApp}>WhatsApp</Button>
              </Box>
              <Box>
                <Button onClick={handleCloseDetail}>Close</Button>
                <Button variant="contained" startIcon={<Print />} onClick={() => handlePrint(selectedBill._id)}>Reprint Invoice</Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
