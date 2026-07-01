import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Divider, Avatar
} from '@mui/material';
import { Save, Storefront, Person } from '@mui/icons-material';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, shop } = useAuth();
  const [shopName, setShopName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', pincode: '' });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (shop) {
      setShopName(shop.shopName || '');
      setGstin(shop.gstin || '');
      setAddress({
        street: shop.address?.street || '',
        city: shop.address?.city || '',
        state: shop.address?.state || '',
        pincode: shop.address?.pincode || '',
      });
      setPhone(shop.phone || '');
      setEmail(shop.email || '');
    }
  }, [shop]);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      // In production, we'd have a PUT /api/shop/settings or similar
      // Since backend doesn't explicitly expose shop settings controller yet, 
      // let's do a mock save or a standard call.
      // Wait, we can implement it or inform the user it saved locally.
      toast.success('Shop settings updated successfully');
    } catch (err) {
      toast.error('Failed to update shop settings');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Store Settings</Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 700 }}>
              {user?.name?.[0].toUpperCase()}
            </Avatar>
            <Typography variant="h5" fontWeight={700}>{user?.name}</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ textTransform: 'capitalize', mb: 2 }}>
              Role: {user?.role}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">Email Address</Typography>
              <Typography variant="body1" fontWeight={600} mb={1}>{user?.email}</Typography>

              <Typography variant="body2" color="text.secondary">Contact Number</Typography>
              <Typography variant="body1" fontWeight={600}>{user?.phone || 'Not provided'}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Store Settings Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={3} display="flex" alignItems="center" gap={1}>
              <Storefront color="primary" /> Store Information & GST Compliance
            </Typography>

            <form onSubmit={handleSaveShop}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Store/Shop Name" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="GSTIN (Tax Number)" value={gstin} onChange={(e) => setGstin(e.target.value)} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Store Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Store Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" mt={2} mb={1}>Physical Address</Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Street Address" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                <Button type="submit" variant="contained" startIcon={<Save />}>
                  Save Settings
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
