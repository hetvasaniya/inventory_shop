import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Divider, Card, CardContent,
  Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Delete, Add, Remove, Search, PointOfSale, Close, CheckCircle } from '@mui/icons-material';
import { useProducts } from '../hooks/useProducts';
import { useCreateBill, useBillPdf } from '../hooks/useBills';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const [items, setItems] = useState([]);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customer, setCustomer] = useState({ name: 'Walk-in Customer', phone: '', email: '' });
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);

  const barcodeInputRef = useRef(null);

  const { data: searchProducts } = useProducts({ search: searchQuery });
  const createBillMutation = useCreateBill();
  const getPdfMutation = useBillPdf();

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;

    try {
      const res = await api.get(`/products/barcode/${barcodeSearch.trim()}`);
      if (res.data?.success && res.data?.data) {
        addItemToBill(res.data.data);
      } else {
        toast.error('Product not found for barcode');
      }
    } catch (err) {
      toast.error('Product not found');
    }
    setBarcodeSearch('');
  };

  const addItemToBill = (product) => {
    const existingIndex = items.findIndex(item => item._id === product._id);
    if (existingIndex > -1) {
      const updatedItems = [...items];
      if (updatedItems[existingIndex].quantity >= product.stock) {
        toast.error(`Cannot add. Only ${product.stock} in stock.`);
        return;
      }
      updatedItems[existingIndex].quantity += 1;
      setItems(updatedItems);
    } else {
      if (product.stock < 1) {
        toast.error('Product is out of stock!');
        return;
      }
      setItems([...items, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added`);
  };

  const updateQuantity = (index, delta) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    const newQty = item.quantity + delta;

    if (newQty < 1) return;
    if (newQty > item.stock) {
      toast.error(`Only ${item.stock} items available in stock.`);
      return;
    }

    item.quantity = newQty;
    setItems(updatedItems);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const basePrice = item.sellingPrice / (1 + (item.gstRate || 0) / 100);
    return sum + basePrice * item.quantity;
  }, 0);

  const totalGst = items.reduce((sum, item) => {
    const basePrice = item.sellingPrice / (1 + (item.gstRate || 0) / 100);
    const tax = item.sellingPrice - basePrice;
    return sum + tax * item.quantity;
  }, 0);

  const grandTotal = subtotal + totalGst;
  const finalTotal = Math.max(0, grandTotal - discount);
  const change = amountPaid ? Math.max(0, parseFloat(amountPaid) - finalTotal) : 0;

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode,
        orderAmount: grandTotal
      });
      if (res.data?.success) {
        const coupon = res.data.data;
        const disc = coupon.calculatedDiscount;
        setDiscount(disc);
        toast.success(`Coupon applied! ₹${disc} discount.`);
      } else {
        toast.error(res.data?.message || 'Invalid coupon');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('No items in the bill');
      return;
    }

    const payload = {
      items: items.map(item => ({
        productId: item._id,
        quantity: item.quantity
      })),
      couponCode: couponCode || null,
      customer,
      paymentDetails: {
        amountPaid: amountPaid ? parseFloat(amountPaid) : finalTotal
      }
    };

    createBillMutation.mutate(payload, {
      onSuccess: (res) => {
        setCreatedBill(res.data);
        setCheckoutSuccess(true);
        setItems([]);
        setCustomer({ name: 'Walk-in Customer', phone: '', email: '' });
        setCouponCode('');
        setDiscount(0);
        setAmountPaid('');
      }
    });
  };

  const handleDownloadPdf = () => {
    if (createdBill) {
      getPdfMutation.mutate(createdBill._id);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Billing Counter (POS)</Typography>

      <Grid container spacing={3}>
        {/* Left Side - Scanner & Bill Stack */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <form onSubmit={handleBarcodeSubmit}>
                  <TextField
                    fullWidth
                    label="Scan Barcode (Press Enter)"
                    placeholder="Barcode scanner input..."
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    inputRef={barcodeInputRef}
                  />
                </form>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={searchProducts?.data || []}
                  getOptionLabel={(option) => `${option.name} (${option.sku})`}
                  onInputChange={(_, value) => setSearchQuery(value)}
                  onChange={(_, value) => value && addItemToBill(value)}
                  renderInput={(params) => <TextField {...params} label="Search Product manually..." />}
                />
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Description</TableCell>
                  <TableCell align="right">Rate (incl. GST)</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No items added to the bill.</TableCell></TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Typography fontWeight={600}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">GST {item.gstRate}% | SKU: {item.sku}</Typography>
                      </TableCell>
                      <TableCell align="right">₹{item.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton onClick={() => updateQuantity(index, -1)} size="small"><Remove /></IconButton>
                          <Typography mx={1}>{item.quantity}</Typography>
                          <IconButton onClick={() => updateQuantity(index, 1)} size="small"><Add /></IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">₹{(item.sellingPrice * item.quantity).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => removeItem(index)} color="error"><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Right Side - Customer & Summary */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Customer Details</Typography>
            <TextField fullWidth label="Phone Number" margin="dense" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <TextField fullWidth label="Customer Name" margin="dense" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <TextField fullWidth label="Email Address" margin="dense" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Apply Coupon</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth placeholder="Coupon Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
              <Button variant="outlined" onClick={handleValidateCoupon}>Apply</Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Bill Summary</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'between', mb: 1 }}>
              <Typography color="text.secondary">Taxable Subtotal</Typography>
              <Typography>₹{subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'between', mb: 1 }}>
              <Typography color="text.secondary">CGST + SGST</Typography>
              <Typography>₹{totalGst.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'between', mb: 1 }}>
              <Typography color="text.secondary">Discount</Typography>
              <Typography sx={{ color: 'success.main' }}>- ₹{discount.toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'between', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Grand Total</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">₹{finalTotal.toFixed(2)}</Typography>
            </Box>

            <TextField
              fullWidth
              label="Cash Tendered (Amount Paid)"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              sx={{ mb: 2 }}
            />
            {amountPaid && (
              <Box sx={{ display: 'flex', justifyContent: 'between', mb: 2 }}>
                <Typography color="text.secondary">Change Due</Typography>
                <Typography variant="subtitle1" fontWeight={700}>₹{change.toFixed(2)}</Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              startIcon={<PointOfSale />}
              onClick={handleCheckout}
              disabled={createBillMutation.isPending}
            >
              Pay & Checkout
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Success Dialog */}
      <Dialog open={checkoutSuccess} onClose={() => setCheckoutSuccess(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 1 }} />
          <Typography variant="h5" fontWeight={700}>Checkout Success!</Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" mb={2}>
            Bill <strong>{createdBill?.billNumber}</strong> has been generated successfully.
          </Typography>
          <Typography variant="h6" color="primary.main" fontWeight={700}>
            Total: ₹{createdBill?.grandTotal?.toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setCheckoutSuccess(false)}>Close</Button>
          <Button variant="contained" onClick={handleDownloadPdf}>Print Invoice (PDF)</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
