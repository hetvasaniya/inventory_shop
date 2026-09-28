import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider, Chip, TablePagination,
  CircularProgress, Tooltip
} from '@mui/material';
import {
  Visibility, Search, Print, WhatsApp, Email, DateRange,
  DeleteSweep, WarningAmber
} from '@mui/icons-material';
import { useBills, useBillPdf, useDeleteDemoBills } from '../hooks/useBills';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BillHistoryPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openDeleteDemoDialog, setOpenDeleteDemoDialog] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const { data: billsData, isLoading } = useBills({
    page: page + 1,
    limit: rowsPerPage,
    search,
    startDate,
    endDate,
  });

  const getPdfMutation = useBillPdf();
  const deleteDemoMutation = useDeleteDemoBills();

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setPage(0);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setPage(0);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
  };

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

  const handleDeleteDemoConfirm = () => {
    deleteDemoMutation.mutate(undefined, {
      onSuccess: () => {
        setOpenDeleteDemoDialog(false);
        setPage(0);
      },
    });
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

  const totalBills = billsData?.pagination?.total ?? (billsData?.data?.length || 0);
  const hasDemoBills = billsData?.data?.some((b) => b.billNumber?.startsWith('AI-DEMO'));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h5" fontWeight={700}>Bill History & Invoices</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={deleteDemoMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DeleteSweep />}
          disabled={deleteDemoMutation.isPending}
          onClick={() => setOpenDeleteDemoDialog(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Delete AI Demo Bills
        </Button>
      </Box>

      {/* Date Range & Search filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search by Bill # or Customer Phone..."
              value={search}
              onChange={handleSearchChange}
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
              onChange={handleStartDateChange}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={handleEndDateChange}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DateRange />}
              onClick={handleClearFilters}
              sx={{ height: '54px' }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
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
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : !billsData?.data || billsData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">No bills found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              billsData.data.map((bill) => {
                const isDemo = bill.billNumber?.startsWith('AI-DEMO');
                return (
                  <TableRow key={bill._id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{bill.billNumber}</span>
                        {isDemo && (
                          <Chip
                            label="DEMO"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: '18px', fontWeight: 700 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(bill.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{bill.customer?.name || 'Walk-in Customer'}</Typography>
                      {bill.customer?.phone && (
                        <Typography variant="caption" color="text.secondary">
                          {bill.customer.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{bill.items?.length || 0} items</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>₹{bill.grandTotal?.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="View Invoice Details">
                          <IconButton onClick={() => handleOpenDetail(bill)} color="primary" size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reprint PDF">
                          <IconButton onClick={() => handlePrint(bill._id)} color="secondary" size="small">
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Dynamic Pagination Controls */}
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={totalBills}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Transactions per page:"
          showFirstButton
          showLastButton
        />
      </TableContainer>

      {/* Delete Demo Bills Confirmation Dialog */}
      <Dialog
        open={openDeleteDemoDialog}
        onClose={() => setOpenDeleteDemoDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber color="error" />
          <Typography variant="h6" fontWeight={700}>Delete AI Demo Bills?</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            This action will permanently remove all generated sample transactions (starting with <strong>AI-DEMO-</strong>) from your store's transaction history.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your real sales bills and inventory will remain completely untouched.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDeleteDemoDialog(false)}
            disabled={deleteDemoMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDemoConfirm}
            disabled={deleteDemoMutation.isPending}
            startIcon={deleteDemoMutation.isPending && <CircularProgress size={16} color="inherit" />}
          >
            {deleteDemoMutation.isPending ? 'Deleting...' : 'Yes, Delete Demo Bills'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill Details Dialog */}
      <Dialog open={openDetailDialog} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {selectedBill && (
          <>
            <DialogTitle>
              <Typography variant="h5" fontWeight={700}>Invoice Details: {selectedBill.billNumber}</Typography>
              <Typography variant="caption" color="text.secondary">
                Billed on: {new Date(selectedBill.createdAt).toLocaleString()} | Billed by: {selectedBill.billedBy?.name || 'Cashier'}
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
                    {selectedBill.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">₹{item.priceAtSale?.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.gstRate}%</TableCell>
                        <TableCell align="right">₹{item.cgst?.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{item.sgst?.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{item.itemTotal?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ width: '100%', maxWidth: 300, ml: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography color="text.secondary">Subtotal (excl. Tax)</Typography>
                  <Typography>₹{selectedBill.subtotal?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography color="text.secondary">Total CGST</Typography>
                  <Typography>₹{selectedBill.totalCgst?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography color="text.secondary">Total SGST</Typography>
                  <Typography>₹{selectedBill.totalSgst?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography color="text.secondary">Discount</Typography>
                  <Typography sx={{ color: 'success.main' }}>- ₹{selectedBill.discount?.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">₹{selectedBill.grandTotal?.toFixed(2)}</Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Customer Email"
                  size="small"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <Button variant="outlined" startIcon={<Email />} onClick={handleShareEmail}>Email Bill</Button>
                <Button variant="outlined" color="success" startIcon={<WhatsApp />} onClick={handleShareWhatsApp}>WhatsApp</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
