import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Divider,
  Tab, Tabs, CircularProgress, InputAdornment, useTheme, alpha,
} from '@mui/material';
import {
  Save, Storefront, Person, Edit, Phone, Email, LocationOn,
  BadgeOutlined, CheckCircleOutline,
} from '@mui/icons-material';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const theme = useTheme();
  const { user, shop, setUser, setShop } = useAuth();
  const [tab, setTab] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  // Profile fields
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Shop fields
  const [shopName, setShopName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', pincode: '' });
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

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
      setShopPhone(shop.phone || '');
      setShopEmail(shop.email || '');
    }
  }, [shop]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        name: profileName,
        phone: profilePhone,
      });
      if (res.data?.success) {
        setUser(res.data.data.user);
        toast.success('Profile updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const res = await api.put('/auth/shop', {
        shopName,
        phone: shopPhone,
        email: shopEmail,
        address,
      });
      if (res.data?.success) {
        setShop(res.data.data.shop);
        toast.success('Shop settings saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update shop settings');
    } finally {
      setSavingShop(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const cardStyle = {
    p: 3,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal profile and store information.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
        }}
      >
        <Tab icon={<Person fontSize="small" />} iconPosition="start" label="My Profile" />
        <Tab icon={<Storefront fontSize="small" />} iconPosition="start" label="Shop &amp; GST" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Avatar Card */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ ...cardStyle, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 90, height: 90, borderRadius: '50%', mx: 'auto', mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 800, color: '#fff',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                }}
              >
                {initials}
              </Box>
              <Typography variant="h5" fontWeight={700}>{user?.name}</Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-block', mt: 0.5, px: 1.5, py: 0.3,
                  borderRadius: 10, fontWeight: 600, textTransform: 'capitalize',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              >
                {user?.role}
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              <Box sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2" fontWeight={600}>{user?.email}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2" fontWeight={600}>{user?.phone || '—'}</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Edit Profile Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={cardStyle}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Edit color="primary" />
                <Typography variant="h6" fontWeight={700}>Edit Profile</Typography>
              </Box>
              <form onSubmit={handleSaveProfile}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Full Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Email Address"
                      value={user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email fontSize="small" sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Phone Number"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone fontSize="small" sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    type="submit" variant="contained"
                    disabled={savingProfile}
                    startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ px: 3, borderRadius: 2 }}
                  >
                    {savingProfile ? 'Saving…' : 'Save Profile'}
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Paper sx={cardStyle}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Storefront color="primary" />
            <Typography variant="h6" fontWeight={700}>Store Information &amp; GST Compliance</Typography>
          </Box>
          <form onSubmit={handleSaveShop}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Store / Shop Name" value={shopName}
                  onChange={(e) => setShopName(e.target.value)} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="GSTIN (Tax Number)" value={gstin}
                  disabled helperText="GSTIN cannot be changed after registration" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Store Phone" value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Store Email" value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  }} />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 0.5 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Physical Address</Typography>
                </Box>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <TextField fullWidth label="Street Address" value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="City" value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="State" value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Pincode" value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                type="submit" variant="contained"
                disabled={savingShop}
                startIcon={savingShop ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline />}
                sx={{ px: 3, borderRadius: 2 }}
              >
                {savingShop ? 'Saving…' : 'Save Shop Settings'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}
    </Box>
  );
}

