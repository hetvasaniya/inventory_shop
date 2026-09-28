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
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  WarningAmber,
  CheckCircle,
  ReportProblem,
  TrendingDown,
  ShoppingCartCheckout,
  LocalShipping,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import ConfusionMatrixCard from '../../components/ai/ConfusionMatrixCard';
import { getStockRisk } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function StockRiskPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [model, setModel] = useState('randomForest');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const fetchData = async (m = model) => {
    setLoading(true);
    try {
      const res = await getStockRisk(m);
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      toast.error('Failed to load stock risk predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleModelChange = (e) => {
    const newM = e.target.value;
    setModel(newM);
    fetchData(newM);
  };

  const summary = result?.data?.summary || {};
  const evalMetrics = result?.data?.modelEvaluation || {};
  const productTable = result?.data?.productTable || [];

  const filteredProducts = productTable.filter((p) => {
    if (riskFilter === 'ALL') return true;
    return p.risk === riskFilter;
  });

  const getRiskChip = (risk) => {
    switch (risk) {
      case 'HIGH':
        return <Chip label="HIGH RISK" size="small" sx={{ fontWeight: 800, bgcolor: '#FEE2E2', color: '#DC2626' }} />;
      case 'MEDIUM':
        return <Chip label="MEDIUM RISK" size="small" sx={{ fontWeight: 800, bgcolor: '#FEF3C7', color: '#D97706' }} />;
      case 'LOW':
      default:
        return <Chip label="LOW RISK" size="small" sx={{ fontWeight: 800, bgcolor: '#D1FAE5', color: '#059669' }} />;
    }
  };

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Stock Risk Alerts — Which Products Might Run Out?"
        subtitle="Shows which products are at risk of going out of stock soon, so you can reorder before it's too late."
        paradigm="Stock Risk Alert"
      />

      {/* Prediction Method Selector */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Prediction Method</Typography>
            <Typography variant="caption" color="text.secondary">
              Switch between two different prediction engines and see which gives better accuracy
            </Typography>
          </Box>
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel id="class-model-label">Prediction Engine</InputLabel>
            <Select
              labelId="class-model-label"
              value={model}
              label="Prediction Engine"
              onChange={handleModelChange}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              <MenuItem value="randomForest">Smart Ensemble (Recommended)</MenuItem>
              <MenuItem value="logisticRegression">Logistic Risk Scorer</MenuItem>
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
          {/* Risk Summary Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  cursor: 'pointer',
                  border: `2px solid ${riskFilter === 'HIGH' ? '#EF4444' : 'rgba(239,68,68,0.2)'}`,
                  bgcolor: alpha('#EF4444', 0.05),
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#DC2626">High Risk — Order Now</Typography>
                  <ReportProblem sx={{ color: '#DC2626' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} color="#DC2626">{summary.highRisk || 0} products</Typography>
                <Typography variant="caption" color="text.secondary">Less than 5 days of stock remaining</Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setRiskFilter(riskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  cursor: 'pointer',
                  border: `2px solid ${riskFilter === 'MEDIUM' ? '#F59E0B' : 'rgba(245,158,11,0.2)'}`,
                  bgcolor: alpha('#F59E0B', 0.05),
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#D97706">Medium Risk — Plan Restock</Typography>
                  <WarningAmber sx={{ color: '#D97706' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} color="#D97706">{summary.mediumRisk || 0} products</Typography>
                <Typography variant="caption" color="text.secondary">5 to 14 days of stock remaining</Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                onClick={() => setRiskFilter(riskFilter === 'LOW' ? 'ALL' : 'LOW')}
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  cursor: 'pointer',
                  border: `2px solid ${riskFilter === 'LOW' ? '#10B981' : 'rgba(16,185,129,0.2)'}`,
                  bgcolor: alpha('#10B981', 0.05),
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#059669">Low Risk — Stock is Fine</Typography>
                  <CheckCircle sx={{ color: '#059669' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} color="#059669">{summary.lowRisk || 0} products</Typography>
                <Typography variant="caption" color="text.secondary">Sufficient stock — no action needed</Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Prediction Accuracy & Confusion Matrix */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Prediction Accuracy</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  How reliably the system identifies at-risk products
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#10B981', 0.1), borderRadius: 2, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Overall Accuracy</Typography>
                      <Typography variant="h5" fontWeight={800} color="#059669">{(evalMetrics.accuracy * 100).toFixed(1)}%</Typography>
                      <Typography variant="caption" color="text.secondary">% predictions correct</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#3B82F6', 0.1), borderRadius: 2, border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Precision</Typography>
                      <Typography variant="h5" fontWeight={800} color="#2563EB">{evalMetrics.precision}</Typography>
                      <Typography variant="caption" color="text.secondary">False alarm rate</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#F59E0B', 0.1), borderRadius: 2, border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Recall</Typography>
                      <Typography variant="h5" fontWeight={800} color="#D97706">{evalMetrics.recall}</Typography>
                      <Typography variant="caption" color="text.secondary">Risk detection rate</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#8B5CF6', 0.1), borderRadius: 2, border: '1px solid rgba(139,92,246,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>F1 Score</Typography>
                      <Typography variant="h5" fontWeight={800} color="#7C3AED">{evalMetrics.f1Score}</Typography>
                      <Typography variant="caption" color="text.secondary">Overall reliability score</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Confusion Matrix */}
            <Grid item xs={12} md={7}>
              <ConfusionMatrixCard
                matrix={evalMetrics.confusionMatrix}
                classNames={evalMetrics.classNames}
                modelName={evalMetrics.selectedModel}
              />
            </Grid>
          </Grid>

          {/* Product Risk Table */}
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Product-by-Product Risk Status</Typography>
                <Typography variant="caption" color="text.secondary">
                  How many days of stock remain and what action to take
                </Typography>
              </Box>
              {riskFilter !== 'ALL' && (
                <Button size="small" onClick={() => setRiskFilter('ALL')} sx={{ textTransform: 'none' }}>
                  Clear Filter (Showing {riskFilter})
                </Button>
              )}
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Current Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Daily Sales</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Risk Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Days Left</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Recommended Action</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Quick Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.product}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.category}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{p.stock}</TableCell>
                      <TableCell align="right">{p.dailySales}</TableCell>
                      <TableCell align="center">{getRiskChip(p.risk)}</TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            color: p.daysLeft < 5 ? '#DC2626' : p.daysLeft < 14 ? '#D97706' : '#059669',
                          }}
                        >
                          {p.daysLeft > 90 ? '> 90 days' : `${p.daysLeft} days`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.recommendedAction}</TableCell>
                      <TableCell align="right">
                        {p.risk === 'HIGH' && (
                          <Button
                            variant="contained"
                            size="small"
                            color="error"
                            startIcon={<ShoppingCartCheckout />}
                            onClick={() => navigate('/purchase-orders')}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 0.3 }}
                          >
                            Reorder
                          </Button>
                        )}
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
