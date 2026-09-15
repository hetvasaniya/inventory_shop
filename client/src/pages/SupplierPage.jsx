import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ShoppingCart,
  ReceiptLong,
  CheckCircle,
  WarningAmber,
  LocalShipping,
  Cancel,
  Inventory,
} from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SupplierPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstin: '',
  });

  // Supplier History State
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data?.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load suppliers');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contactPerson: '', email: '', phone: '', gstin: '' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      gstin: supplier.gstin || '',
    });
    setOpenDialog(true);
  };

  const handleViewOrders = async (supplier) => {
    setSelectedSupplierForHistory(supplier);
    setOpenHistoryDialog(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/purchase-orders/supplier/${supplier._id}/history`);
      if (res.data?.success) {
        setHistoryData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load supplier purchase history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreatePOForSupplier = (supplierId) => {
    navigate('/purchase-orders', {
      state: { tab: 1, preselectedSupplierId: supplierId },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier created successfully');
      }
      fetchSuppliers();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to save supplier details');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success('Supplier deleted');
        fetchSuppliers();
      } catch (err) {
        toast.error('Failed to delete supplier');
      }
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Received':
        return <Chip label="Received" color="success" size="small" icon={<CheckCircle />} />;
      case 'Partially Received':
        return <Chip label="Partially Received" color="info" size="small" icon={<Inventory />} />;
      case 'Ordered':
      case 'Confirmed':
      case 'Shipped':
        return <Chip label={status} color="primary" size="small" icon={<LocalShipping />} />;
      case 'Pending':
        return <Chip label="Pending" color="warning" size="small" icon={<WarningAmber />} />;
      case 'Cancelled':
        return <Chip label="Cancelled" color="error" size="small" icon={<Cancel />} />;
      default:
        return <Chip label={status || 'Draft'} size="small" />;
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Supplier Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your vendors, view purchase history, and create restocking purchase orders.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAdd}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          Add Supplier
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>GSTIN</TableCell>
              <TableCell align="center">Purchase Orders</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No suppliers listed. Click "Add Supplier" to get started.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {supplier.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                  <TableCell>{supplier.phone || 'N/A'}</TableCell>
                  <TableCell>{supplier.email || 'N/A'}</TableCell>
                  <TableCell>{supplier.gstin || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ReceiptLong />}
                        onClick={() => handleViewOrders(supplier)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        View Orders
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<ShoppingCart />}
                        onClick={() => handleCreatePOForSupplier(supplier._id)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Create PO
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title="Edit Supplier">
                        <IconButton
                          onClick={() => handleOpenEdit(supplier)}
                          color="primary"
                          size="small"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Supplier">
                        <IconButton
                          onClick={() => handleDelete(supplier._id)}
                          color="error"
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Supplier Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Supplier Company Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="contactPerson"
                  label="Contact Person Name"
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="phone"
                  label="Phone Number (10 digits)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="gstin"
                  label="GSTIN (15 Digits)"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* VIEW ORDERS & PURCHASE HISTORY MODAL */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <ReceiptLong color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Purchase History — {selectedSupplierForHistory?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lifetime orders, spending, and fulfillment tracking
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<ShoppingCart />}
            onClick={() => {
              setOpenHistoryDialog(false);
              handleCreatePOForSupplier(selectedSupplierForHistory?._id);
            }}
          >
            Create New PO
          </Button>
        </DialogTitle>

        <DialogContent dividers>
          {loadingHistory ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary" mt={1}>
                Loading purchase order history...
              </Typography>
            </Box>
          ) : !historyData ? (
            <Typography>No history available.</Typography>
          ) : (
            <Box>
              {/* Metrics Summary Row */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={2.4}>
                  <Card sx={{ bgcolor: 'action.hover' }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Orders
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        {historyData.metrics?.totalOrders || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Card sx={{ bgcolor: 'action.hover' }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="warning.main">
                        Pending
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="warning.main">
                        {historyData.metrics?.pendingOrders || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Card sx={{ bgcolor: 'action.hover' }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="primary.main">
                        Ordered / Shipped
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="primary.main">
                        {historyData.metrics?.orderedOrders || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Card sx={{ bgcolor: 'action.hover' }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="success.main">
                        Received
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="success.main">
                        {historyData.metrics?.receivedOrders || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={2.4}>
                  <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Total Spend
                      </Typography>
                      <Typography variant="h6" fontWeight={800}>
                        ₹{historyData.metrics?.totalPurchaseAmount?.toFixed(2) || '0.00'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Past Orders Table */}
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Recent Purchase Orders
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PO Number</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell align="center">Products</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyData.orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                          No purchase orders created for this supplier yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyData.orders.map((order) => (
                        <TableRow key={order._id} hover>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {order.poNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(order.orderDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell align="center">{order.items?.length || 0}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{order.grandTotal?.toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusChip(order.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
