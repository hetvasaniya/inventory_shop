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
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  ShoppingCartCheckout,
  Inventory2,
  Psychology,
  CheckCircle,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getDemandForecast } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function DemandForecastPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [horizon, setHorizon] = useState(7);
  const [model, setModel] = useState('randomForest');

  const fetchData = async (prodId = selectedProductId, h = horizon, m = model) => {
    setLoading(true);
    try {
      const res = await getDemandForecast(prodId, h, m);
      if (res.success) {
        setResult(res);
        if (res.data?.product?.id && !selectedProductId) {
          setSelectedProductId(res.data.product.id);
        }
      }
    } catch (err) {
      toast.error('Failed to load demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (e) => {
    const newId = e.target.value;
    setSelectedProductId(newId);
    fetchData(newId, horizon, model);
  };

  const handleHorizonChange = (e) => {
    const newH = e.target.value;
    setHorizon(newH);
    fetchData(selectedProductId, newH, model);
  };

  const handleModelChange = (e) => {
    const newM = e.target.value;
    setModel(newM);
    fetchData(selectedProductId, horizon, newM);
  };

  const product = result?.data?.product || {};
  const forecast = result?.data?.forecast || {};
  const metrics = result?.data?.modelEvaluation || {};
  const dailyBreakdown = forecast.dailyBreakdown || [];
  const productsList = result?.data?.productsList || [];

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Demand Forecast — How Much Stock Do You Need?"
        subtitle="Predicts how many units each product will sell in the coming days, so you can order the right stock at the right time."
        paradigm="Sales Forecast"
      />

      {/* Interactive Controls Bar */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="prod-select-label">Select Product</InputLabel>
              <Select
                labelId="prod-select-label"
                value={selectedProductId || (product.id || '')}
                label="Select Product"
                onChange={handleProductChange}
                disabled={loading || productsList.length === 0}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                {productsList.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="horizon-select-label">Forecast Period</InputLabel>
              <Select
                labelId="horizon-select-label"
                value={horizon}
                label="Forecast Period"
                onChange={handleHorizonChange}
                disabled={loading}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                <MenuItem value={7}>Next 7 Days</MenuItem>
                <MenuItem value={14}>Next 14 Days</MenuItem>
                <MenuItem value={30}>Next 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="model-select-label">Prediction Method</InputLabel>
              <Select
                labelId="model-select-label"
                value={model}
                label="Prediction Method"
                onChange={handleModelChange}
                disabled={loading}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                <MenuItem value="randomForest">Smart Ensemble (Recommended)</MenuItem>
                <MenuItem value="gradientBoost">Gradient Boost Method</MenuItem>
                <MenuItem value="linearRegression">Simple Linear Method</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
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
          {/* Key Output Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, p: 2, height: '100%', border: '1px solid rgba(59,130,246,0.3)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Selected Product</Typography>
                <Typography variant="h6" fontWeight={800} color="#3B82F6">{product.name}</Typography>
                <Typography variant="caption" color="text.secondary">Category: {product.category}</Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, p: 2, height: '100%', border: '1px solid rgba(6,182,212,0.3)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Current Stock</Typography>
                <Typography variant="h4" fontWeight={800} color="#06B6D4">{product.currentStock} units</Typography>
                <Typography variant="caption" color="text.secondary">Min Buffer: {product.minStockLevel} units</Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, p: 2, height: '100%', border: '1px solid rgba(139,92,246,0.3)', bgcolor: alpha('#8B5CF6', 0.04) }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Expected Demand ({horizon} Days)</Typography>
                <Typography variant="h4" fontWeight={800} color="#7C3AED">{forecast.predictedDemand} units</Typography>
                <Typography variant="caption" color="text.secondary">Based on your sales history</Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, p: 2, height: '100%', border: '1px solid rgba(16,185,129,0.3)', bgcolor: alpha('#10B981', 0.04) }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Suggested Order Quantity</Typography>
                <Typography variant="h4" fontWeight={800} color="#059669">{forecast.recommendedOrder} units</Typography>
                <Typography variant="caption" color="text.secondary">
                  {forecast.recommendedOrder > 0 ? 'Place purchase order to avoid running out' : 'Stock level is healthy'}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Forecast Chart */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Expected Daily Sales — Next {horizon} Days</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Forecasted demand for {product.name}
                    </Typography>
                  </Box>
                  <Chip label="Forecast" size="small" sx={{ fontWeight: 600 }} />
                </Box>
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <AreaChart data={dailyBreakdown}>
                      <defs>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [`${val} units`, 'Predicted Sales']} />
                      <Area type="monotone" dataKey="predictedUnits" stroke="#7C3AED" strokeWidth={2.5} fillOpacity={1} fill="url(#colorForecast)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Prediction Accuracy Summary */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Prediction Accuracy</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  How reliable the forecast is based on your past data
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Average Error (MAE)</Typography>
                    <Typography variant="h6" fontWeight={800} color="#3B82F6">{metrics.mae}</Typography>
                    <Typography variant="caption" color="text.secondary">On average, off by this many units per day</Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Error Sensitivity (RMSE)</Typography>
                    <Typography variant="h6" fontWeight={800} color="#F59E0B">{metrics.rmse}</Typography>
                    <Typography variant="caption" color="text.secondary">Penalizes large prediction errors more</Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: alpha('#10B981', 0.1), borderRadius: 2, border: '1px solid rgba(16,185,129,0.3)' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Forecast Accuracy (R²)</Typography>
                    <Typography variant="h6" fontWeight={800} color="#059669">{metrics.r2}</Typography>
                    <Typography variant="caption" color="text.secondary">1.0 = perfect; above 0.7 is good</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
