import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import {
  Inventory2,
  TrendingUp,
  CurrencyRupee,
  ShowChart,
  WarningAmber,
  ProductionQuantityLimits,
  Psychology,
  ArrowForward,
  ShoppingCartCheckout,
  CheckCircle,
  LocalShipping,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getAiDashboard } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function AiDashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAiDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load Analytics Dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} sx={{ color: '#7C3AED' }} />
      </Box>
    );
  }

  const summary = data?.summaryCards || {};
  const charts = data?.charts || {};

  const kpis = [
    { label: 'Total Products', value: summary.totalProducts || 0, icon: <Inventory2 />, color: '#3B82F6' },
    { label: 'Total Units Sold', value: summary.totalSalesUnits || 0, icon: <TrendingUp />, color: '#10B981' },
    { label: 'Total Revenue', value: `₹${(summary.totalRevenue || 0).toLocaleString()}`, icon: <CurrencyRupee />, color: '#8B5CF6' },
    { label: 'Total Stock Available', value: summary.totalStockUnits || 0, icon: <ProductionQuantityLimits />, color: '#06B6D4' },
    { label: 'Avg Daily Sales', value: `${summary.avgDailySales || 0} /day`, icon: <ShowChart />, color: '#F59E0B' },
    { label: 'Avg Bill Value', value: `₹${summary.avgOrderValue || 0}`, icon: <CurrencyRupee />, color: '#EC4899' },
    { label: 'Low Stock Products', value: summary.lowStockProducts || 0, icon: <WarningAmber />, color: '#EAB308' },
    { label: 'Out of Stock', value: summary.outOfStockProducts || 0, icon: <WarningAmber />, color: '#EF4444' },
    { label: 'High Risk Products', value: summary.highRiskProducts || 0, icon: <WarningAmber />, color: '#DC2626' },
    { label: 'Expected Demand (7 Days)', value: `${summary.predictedDemand7Days || 0} units`, icon: <Psychology />, color: '#6366F1' },
    { label: 'Reorder Suggestions', value: summary.reorderSuggestionsCount || 0, icon: <ShoppingCartCheckout />, color: '#14B8A6' },
  ];

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Analytics & Insights Dashboard"
        subtitle="Live inventory overview — sales trends, stock alerts, demand estimates, and top-selling products for your store."
        paradigm="Overview"
      />

      {/* KPI Cards Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
            <Card
              sx={{
                borderRadius: 2.5,
                p: 0.5,
                height: '100%',
                border: `1px solid ${alpha(kpi.color, 0.2)}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: `0 8px 20px ${alpha(kpi.color, 0.15)}`,
                },
              }}
            >
              <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {kpi.label}
                  </Typography>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      bgcolor: alpha(kpi.color, 0.12),
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', fontSize: '1.15rem' }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1: Sales & Revenue Timeline */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Sales & Revenue Trend</Typography>
                <Typography variant="caption" color="text.secondary">Daily sales quantity and revenue over the last 30 days</Typography>
              </Box>
              <Chip label="Last 30 Days" size="small" sx={{ fontWeight: 600 }} />
            </Box>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={charts.salesTrend || []}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorRev)" />
                  <Line yAxisId="right" type="monotone" dataKey="sales" name="Units Sold" stroke="#3B82F6" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Stock Risk Distribution Donut */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Stock Risk Overview</Typography>
              <Typography variant="caption" color="text.secondary">How many products are at risk of running out</Typography>
            </Box>
            <Box sx={{ width: '100%', height: 230 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={charts.stockRiskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(charts.stockRiskDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/ai/stock-risk')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                See Full Stock Risk Details
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2: Category Sales & Top Products */}
      <Grid container spacing={3}>
        {/* Category-wise Sales & Stock */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Category-Wise Sales & Stock</Typography>
                <Typography variant="caption" color="text.secondary">Units sold vs current available stock by category</Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/ai/category-analysis')} sx={{ textTransform: 'none' }}>
                Full Category View
              </Button>
            </Box>
            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={charts.categoryBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" name="Units Sold" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stock" name="Current Stock" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Top-Selling Products Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Top-Selling Products</Typography>
                <Typography variant="caption" color="text.secondary">Ranked by total units sold</Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/ai/demand-forecast')} sx={{ textTransform: 'none' }}>
                Demand Forecast
              </Button>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Units Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(charts.topSellingProducts || []).map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{row.category}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#10B981' }}>{row.unitsSold}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>₹{row.revenue.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={row.stock}
                          size="small"
                          color={row.stock <= 10 ? 'error' : 'default'}
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
