import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { TrendingUp, Warning, ErrorOutline, LocalOffer, Assessment } from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const fetchData = async () => {
    try {
      const [dashRes, salesRes, lowRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/sales'),
        api.get('/products/low-stock/list')
      ]);

      if (dashRes.data?.success) setDashboardData(dashRes.data.data);
      if (salesRes.data?.success) {
        setDailySales(salesRes.data.data.revenueTrend || []);
        setCategorySales(salesRes.data.data.categorySales || []);
      }
      if (lowRes.data?.success) setLowStock(lowRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load reports data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Business Reports & Analytics</Typography>

      {/* Summary Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Today's Revenue</Typography>
              <Typography variant="h4" fontWeight={700}>₹{dashboardData?.today?.revenue?.toFixed(2) || '0.00'}</Typography>
              <Typography variant="caption" color="text.secondary">{dashboardData?.today?.billCount || 0} Bills Generated</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Today's GST Collected</Typography>
              <Typography variant="h4" fontWeight={700}>₹{dashboardData?.today?.gstCollected?.toFixed(2) || '0.00'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #2196F3' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Low Stock Alerts</Typography>
              <Typography variant="h4" fontWeight={700}>{dashboardData?.inventory?.lowStockCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #F44336' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Expiring Items (30d)</Typography>
              <Typography variant="h4" fontWeight={700}>{dashboardData?.inventory?.expiringCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts section */}
      <Grid container spacing={3} mb={4}>
        {/* Sales Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Daily Sales Trend (Last 30 Days)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={dailySales}>
                <XAxis dataKey="date" stroke="#90A4AE" />
                <YAxis stroke="#90A4AE" />
                <Tooltip contentStyle={{ backgroundColor: '#112233', border: 'none', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#1976D2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category breakdown */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Sales by Category</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={categorySales}>
                <XAxis dataKey="category" stroke="#90A4AE" />
                <YAxis stroke="#90A4AE" />
                <Tooltip contentStyle={{ backgroundColor: '#112233', border: 'none', borderRadius: 8 }} />
                <Bar dataKey="totalRevenue" name="Sales (₹)" fill="#00BCD4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Low Stock Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color="error.main">Low Stock Warning Directory</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Min Stock Level</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowStock.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">All product stocks are healthy!</TableCell></TableRow>
              ) : (
                lowStock.map((prod) => (
                  <TableRow key={prod._id}>
                    <TableCell fontWeight={600}>{prod.name}</TableCell>
                    <TableCell>{prod.sku}</TableCell>
                    <TableCell>{prod.category}</TableCell>
                    <TableCell align="right" style={{ color: '#FF9800', fontWeight: 700 }}>{prod.stock}</TableCell>
                    <TableCell align="right">{prod.minStockLevel}</TableCell>
                    <TableCell>
                      <Chip label="Reorder Required" color="warning" size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
