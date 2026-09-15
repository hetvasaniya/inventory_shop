import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  PointOfSale,
  Inventory,
  LocalShipping,
  Warning,
  TrendingUp,
  WavingHand,
  ShoppingCart,
  ReceiptLong,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, salesRes, lowRes, poRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/sales'),
          api.get('/products/low-stock/list'),
          api.get('/purchase-orders?limit=5&status=Pending'),
        ]);

        if (dashRes.data?.success) setStats(dashRes.data.data);
        if (salesRes.data?.success) setSalesTrend(salesRes.data.data.revenueTrend || []);
        if (lowRes.data?.success) setLowStockList(lowRes.data.data?.slice(0, 5) || []);
        if (poRes.data?.success) setPendingPOs(poRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard statistics');
      }
    };
    fetchDashboardData();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      {/* Welcome Banner */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.12
          )} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <WavingHand sx={{ fontSize: 36, color: '#F59E0B' }} />
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            {greeting}, {user?.name?.split(' ')[0] || 'there'}! 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.3}>
            Here's a live snapshot of your store today. Let's have a great day!
          </Typography>
        </Box>
      </Box>

      {/* Main Stats Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: 'background.paper',
              borderLeft: '4px solid #4CAF50',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/sales')}
          >
            <CardContent
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                  Today's Sales
                </Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>
                  ₹{stats?.today?.revenue?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#E8F5E9', color: '#4CAF50' }}>
                <TrendingUp />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: 'background.paper',
              borderLeft: '4px solid #FF9800',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/inventory')}
          >
            <CardContent
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                  Low Stock Items
                </Typography>
                <Typography variant="h4" fontWeight={800} mt={1} color="warning.main">
                  {stats?.inventory?.lowStockCount || 0}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#FFF3E0', color: '#FF9800' }}>
                <Warning />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: 'background.paper',
              borderLeft: '4px solid #9C27B0',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/purchase-orders')}
          >
            <CardContent
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                  Pending Purchase Orders
                </Typography>
                <Typography variant="h4" fontWeight={800} mt={1} color="secondary.main">
                  {pendingPOs.length}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#F3E5F5', color: '#9C27B0' }}>
                <ShoppingCart />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: 'background.paper',
              borderLeft: '4px solid #2196F3',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/inventory')}
          >
            <CardContent
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                  Total Catalog Products
                </Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>
                  {stats?.inventory?.totalProducts || 0}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#E3F2FD', color: '#2196F3' }}>
                <Inventory />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Analytics & Action Center */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 380, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Revenue Overview
            </Typography>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976D2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#90A4AE" />
                <YAxis stroke="#90A4AE" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                    color: theme.palette.text.primary,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  stroke="#1976D2"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>

          {/* Pending Restock & Purchase Orders section */}
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Pending Purchase Orders
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/purchase-orders')}
              >
                View All POs
              </Button>
            </Box>
            {pendingPOs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={1}>
                No pending purchase orders waiting for delivery.
              </Typography>
            ) : (
              <List disablePadding>
                {pendingPOs.map((po) => (
                  <ListItem
                    key={po._id}
                    disableGutters
                    secondaryAction={
                      <Chip label={`₹${po.grandTotal?.toFixed(2)}`} color="primary" size="small" />
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LocalShipping color="action" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={700}>
                          {po.poNumber} — {po.supplier?.name}
                        </Typography>
                      }
                      secondary={`${po.items?.length || 0} product(s) ordered`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions & Stock Warnings */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Quick Operations
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<PointOfSale />}
              size="large"
              onClick={() => navigate('/billing')}
            >
              New Billing Counter (POS)
            </Button>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<ShoppingCart />}
              size="large"
              onClick={() => navigate('/purchase-orders', { state: { tab: 1 } })}
            >
              Create Purchase Order
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Inventory />}
              size="large"
              onClick={() => navigate('/inventory')}
            >
              Inventory Management
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              startIcon={<LocalShipping />}
              size="large"
              onClick={() => navigate('/suppliers')}
            >
              Manage Suppliers
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700} color="warning.main">
                Low Stock Warnings
              </Typography>
              <Button
                size="small"
                color="warning"
                onClick={() => navigate('/purchase-orders', { state: { tab: 1 } })}
              >
                Restock All
              </Button>
            </Box>
            <Divider sx={{ my: 1 }} />
            {lowStockList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                All products are fully stocked.
              </Typography>
            ) : (
              <List disablePadding>
                {lowStockList.map((prod) => (
                  <ListItem
                    key={prod._id}
                    disableGutters
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() =>
                          navigate('/purchase-orders', {
                            state: {
                              tab: 1,
                              preselectedSupplierId: prod.supplier?._id || prod.supplier,
                              preselectedProductId: prod._id,
                            },
                          })
                        }
                        sx={{ fontSize: '0.7rem', py: 0.2, px: 0.8 }}
                      >
                        Restock
                      </Button>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Warning color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={prod.name}
                      secondary={`Stock: ${prod.stock} (Min: ${prod.minStockLevel})`}
                    />
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
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
