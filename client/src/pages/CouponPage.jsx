import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Select, MenuItem,
  FormControl, InputLabel
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function CouponPage() {
  const [coupons, setCoupons] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '', description: '', discountType: 'percentage', discountValue: '',
    minOrderAmount: '', validUntil: ''
  });

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/coupons');
      if (res.data?.success) {
        setCoupons(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load coupons');
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setFormData({
      code: '', description: '', discountType: 'percentage', discountValue: '',
      minOrderAmount: '0', validUntil: ''
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || 0,
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : ''
    });
    setOpenDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      discountValue: parseFloat(formData.discountValue),
      minOrderAmount: parseFloat(formData.minOrderAmount)
    };

    try {
      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon._id}`, payload);
        toast.success('Coupon updated');
      } else {
        await api.post('/coupons', payload);
        toast.success('Coupon created');
      }
      fetchCoupons();
      setOpenDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await api.delete(`/coupons/${id}`);
        toast.success('Coupon deleted');
        fetchCoupons();
      } catch (err) {
        toast.error('Failed to delete coupon');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Coupons & Promotions</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          Create Coupon
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">Min Order</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No coupons active.</TableCell></TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon._id}>
                  <TableCell fontWeight={700} color="primary">{coupon.code}</TableCell>
                  <TableCell>{coupon.description}</TableCell>
                  <TableCell style={{ textTransform: 'capitalize' }}>{coupon.discountType}</TableCell>
                  <TableCell align="right">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                  </TableCell>
                  <TableCell align="right">₹{coupon.minOrderAmount || 0}</TableCell>
                  <TableCell>{new Date(coupon.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpenEdit(coupon)} color="primary"><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(coupon._id)} color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth name="code" label="Coupon Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="description" label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select name="discountType" value={formData.discountType} label="Discount Type" onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}>
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="flat">Flat Price (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="discountValue" label="Discount Value" type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="minOrderAmount" label="Min Order Amount Required" type="number" value={formData.minOrderAmount} onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="validUntil" label="Valid Until" type="date" InputLabelProps={{ shrink: true }} value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} required />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingCoupon ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
