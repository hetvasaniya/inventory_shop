import { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper, Card, CardContent, Button, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { PointOfSale, Inventory, LocalShipping, Warning, ArrowForward, AccessTime, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, salesRes, lowRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/sales'),
          api.get('/products/low-stock/list')
        ]);

        if (dashRes.data?.success) setStats(dashRes.data.data);
        if (salesRes.data?.success) setSalesTrend(salesRes.data.data.revenueTrend || []);
        if (lowRes.data?.success) setLowStockList(lowRes.data.data?.slice(0, 5) || []);
      } catch (err) {
        toast.error('Failed to load dashboard statistics');
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Real-time shop status overview and inventory metrics.
      </Typography>

      {/* Main Stats Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #4CAF50' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>Today's Sales</Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>₹{stats?.today?.revenue?.toFixed(2) || '0.00'}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#E8F5E9', color: '#4CAF50' }}><TrendingUp /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #FF9800' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>Low Stock Items</Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>{stats?.inventory?.lowStockCount || 0}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#FFF3E0', color: '#FF9800' }}><Warning /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #2196F3' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>Total Products</Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>{stats?.inventory?.totalProducts || 0}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#E3F2FD', color: '#2196F3' }}><Inventory /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #9C27B0' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>Transactions Today</Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>{stats?.today?.billCount || 0}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#F3E5F5', color: '#9C27B0' }}><PointOfSale /></Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Analytics & Action Center */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 380 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Revenue Overview</Typography>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976D2" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1976D2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#90A4AE" />
                <YAxis stroke="#90A4AE" />
                <Tooltip contentStyle={{ backgroundColor: '#112233', border: 'none', borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#1976D2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Quick Actions & Stock Warnings */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1}>Quick Operations</Typography>
            <Button variant="contained" fullWidth startIcon={<PointOfSale />} size="large" onClick={() => navigate('/billing')}>
              New Billing Counter (POS)
            </Button>
            <Button variant="outlined" fullWidth startIcon={<Inventory />} size="large" onClick={() => navigate('/inventory')}>
              Add Stock Item
            </Button>
            <Button variant="outlined" color="secondary" fullWidth startIcon={<LocalShipping />} size="large" onClick={() => navigate('/suppliers')}>
              Manage Suppliers
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={1} color="warning.main">Low Stock Warnings</Typography>
            <Divider sx={{ my: 1 }} />
            {lowStockList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                All products are fully stocked.
              </Typography>
            ) : (
              <List disablePadding>
                {lowStockList.map((prod) => (
                  <ListItem key={prod._id} disableGutters secondaryAction={
                    <Typography variant="body2" color="error.main" fontWeight={700}>{prod.stock} left</Typography>
                  }>
                    <ListItemIcon sx={{ minWidth: 32 }}><Warning color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText primary={prod.name} secondary={`Min: ${prod.minStockLevel}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// Simple Avatar wrapper helper
function Avatar({ children, sx }) {
  return (
    <Box sx={{
      width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...sx
    }}>
      {children}
    </Box>
  );
}
