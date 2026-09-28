import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FilterList,
  Category as CategoryIcon,
  AttachMoney,
  Inventory2,
  TrendingUp,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
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
import AiHeader from '../../components/ai/AiHeader';
import { getCategoryAnalysis } from '../../services/aiService';
import toast from 'react-hot-toast';

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#6366F1'];

export default function CategoryAnalysisPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCategoryAnalysis(startDate, endDate);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load category analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchData();
  };

  const categories = data?.categories || [];
  const totalRevenue = data?.totalRevenue || 0;

  // Pie chart data: Category contribution
  const pieData = categories.map((c) => ({
    name: c.category,
    value: c.revenue,
    percentage: c.contributionPercent,
  }));

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Category-Wise Sales & Revenue Breakdown"
        subtitle="See which product categories bring the most revenue, have the most stock, and need attention."
        paradigm="Category Breakdown"
      />

      {/* Date Filter Card */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box
          component="form"
          onSubmit={handleApplyFilter}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>Filter Analysis by Date Range</Typography>
            <Typography variant="caption" color="text.secondary">
              Calculate category performance over selected billing periods
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              type="date"
              size="small"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              size="small"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<FilterList />}
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
              }}
            >
              Apply Filter
            </Button>
            {(startDate || endDate) && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  getCategoryAnalysis('', '').then((res) => {
                    if (res.success) setData(res.data);
                  });
                }}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={44} sx={{ color: '#7C3AED' }} />
        </Box>
      ) : (
        <>
          {/* Charts Row: Contribution Donut + Volume Bar */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700}>Category Revenue Contribution (%)</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Percentage share of total gross shop revenue
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700}>Category Sales & Stock Comparison</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Units sold versus inventory holding by department
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={categories}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="unitsSold" name="Units Sold" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="stock" name="Current Stock" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Full Category Table as specified in Section 4 */}
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Category Performance Matrix</Typography>
              <Typography variant="caption" color="text.secondary">
                Detailed breakdowns including product counts, units sold, gross revenue, and stock risk indicators
              </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Products</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Units Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Revenue (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Avg Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Stock Units</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Contribution</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Low / Out Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.category} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CategoryIcon fontSize="small" sx={{ color: '#7C3AED' }} />
                          {c.category}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{c.products}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#10B981' }}>{c.unitsSold}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>₹{c.revenue.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{c.averagePrice}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{c.stock}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${c.contributionPercent}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: alpha('#7C3AED', 0.1),
                            color: '#7C3AED',
                            border: '1px solid rgba(124, 58, 237, 0.2)',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center' }}>
                          {c.lowStockProducts > 0 && (
                            <Chip label={`${c.lowStockProducts} low`} size="small" color="warning" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                          )}
                          {c.outOfStockProducts > 0 && (
                            <Chip label={`${c.outOfStockProducts} out`} size="small" color="error" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                          )}
                          {c.lowStockProducts === 0 && c.outOfStockProducts === 0 && (
                            <Typography variant="caption" color="text.secondary">Optimal</Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
}
