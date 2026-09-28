import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  alpha,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  Calculate,
  BarChart as BarChartIcon,
  StackedBarChart,
  Timeline,
  Analytics,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
} from 'recharts';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getNumericalAnalysis } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function NumericalAnalysisPage() {
  const theme = useTheme();
  const [variable, setVariable] = useState('sales');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  const fetchData = async (selectedVar = variable) => {
    setLoading(true);
    try {
      const res = await getNumericalAnalysis(selectedVar);
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      toast.error('Failed to load sales statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(variable);
  }, [variable]);

  const handleVariableChange = (e) => {
    const newVar = e.target.value;
    setVariable(newVar);
  };

  const variables = [
    { value: 'sales', label: 'Units Sold per Item' },
    { value: 'price', label: 'Product Selling Price (₹)' },
    { value: 'stock', label: 'Stock Quantity per Product' },
    { value: 'revenue', label: 'Revenue per Sale Line (₹)' },
    { value: 'orderValue', label: 'Total Bill Value (₹)' },
  ];

  const stats = result?.data?.statistics || {};
  const quartiles = stats?.quartiles || {};
  const boxPlot = result?.data?.boxPlot || {};
  const histogram = result?.data?.histogram || [];
  const unit = result?.data?.unit || '';

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Sales Statistics & Distribution"
        subtitle="Understand your store numbers — average sales, price ranges, stock levels, and how your data is spread out."
        paradigm="Sales Statistics"
      />

      {/* Variable Selector Control */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Choose What to Analyze</Typography>
            <Typography variant="caption" color="text.secondary">
              Select a data type to see averages, min/max, and distribution charts
            </Typography>
          </Box>
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel id="variable-select-label">Data to Analyze</InputLabel>
            <Select
              labelId="variable-select-label"
              value={variable}
              label="Data to Analyze"
              onChange={handleVariableChange}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {variables.map((v) => (
                <MenuItem key={v.value} value={v.value}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={44} sx={{ color: '#7C3AED' }} />
        </Box>
      ) : result?.insufficientData ? (
        <EmptyDataState
          reason={result.reason}
          minimumRequirement={result.minimumRequirement}
        />
      ) : (
        <>
          {/* Summary Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(59,130,246,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Records</Typography>
                  <Typography variant="h5" fontWeight={800} color="#3B82F6">{stats.sampleCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Data Points</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Average</Typography>
                  <Typography variant="h5" fontWeight={800} color="#10B981">{stats.mean} {unit}</Typography>
                  <Typography variant="caption" color="text.secondary">Mean Value</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(139,92,246,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Middle Value</Typography>
                  <Typography variant="h5" fontWeight={800} color="#8B5CF6">{stats.median} {unit}</Typography>
                  <Typography variant="caption" color="text.secondary">Median (50th %)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(245,158,11,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Spread</Typography>
                  <Typography variant="h5" fontWeight={800} color="#F59E0B">{stats.stdDev}</Typography>
                  <Typography variant="caption" color="text.secondary">Std Deviation</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(236,72,153,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Variance</Typography>
                  <Typography variant="h5" fontWeight={800} color="#EC4899">{stats.variance}</Typography>
                  <Typography variant="caption" color="text.secondary">Data Variation</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2.5, height: '100%', border: '1px solid rgba(6,182,212,0.2)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Min – Max</Typography>
                  <Typography variant="h6" fontWeight={800} color="#06B6D4">{stats.min} – {stats.max}</Typography>
                  <Typography variant="caption" color="text.secondary">Value Range</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quartiles & Frequency Histogram */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Value Breakdown (Quartiles)</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  How the data is split into four equal parts
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>Lowest Value</Typography>
                    <Typography variant="body2" fontWeight={800}>{stats.min} {unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>Bottom 25%</Typography>
                    <Typography variant="body2" fontWeight={800} color="#3B82F6">{quartiles.q1} {unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: alpha('#8B5CF6', 0.1), borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#8B5CF6">Middle (50%)</Typography>
                    <Typography variant="body2" fontWeight={800} color="#8B5CF6">{quartiles.q2} {unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>Top 75%</Typography>
                    <Typography variant="body2" fontWeight={800} color="#10B981">{quartiles.q3} {unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>Middle Range (IQR)</Typography>
                    <Typography variant="body2" fontWeight={800}>{quartiles.iqr} {unit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>Unusual Values Found</Typography>
                    <Chip
                      label={`${boxPlot.outliersCount || 0} outliers`}
                      size="small"
                      color={boxPlot.outliersCount > 0 ? 'warning' : 'success'}
                      sx={{ height: 22, fontWeight: 700 }}
                    />
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Frequency Histogram Chart */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Frequency Distribution Chart</Typography>
                    <Typography variant="caption" color="text.secondary">
                      How often each value range appears in your data
                    </Typography>
                  </Box>
                  <Chip label="Histogram" size="small" sx={{ fontWeight: 600 }} />
                </Box>

                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={histogram}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val, name) => [
                          name === 'Frequency (Count)' ? `${val} records` : `${(val * 100).toFixed(1)}%`,
                          name,
                        ]}
                      />
                      <Bar dataKey="count" name="Frequency (Count)" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
