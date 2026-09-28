import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  CircularProgress,
  useTheme,
  alpha,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Divider,
} from '@mui/material';
import {
  AutoAwesome,
  ShoppingBag,
  TrendingUp,
  Receipt,
  CheckCircle,
  Lightbulb,
} from '@mui/icons-material';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getProductRecommendations } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function ProductRecommendationsPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [minSupport, setMinSupport] = useState(0.03);
  const [minConfidence, setMinConfidence] = useState(0.15);
  const [selectedBasket, setSelectedBasket] = useState([]);

  const fetchData = async (sup = minSupport, conf = minConfidence, basketItems = selectedBasket) => {
    setLoading(true);
    try {
      const basketStr = basketItems.join(',');
      const res = await getProductRecommendations(sup, conf, basketStr);
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      toast.error('Failed to load product recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBasketChange = (event) => {
    const { target: { value } } = event;
    const items = typeof value === 'string' ? value.split(',') : value;
    setSelectedBasket(items);
    fetchData(minSupport, minConfidence, items);
  };

  const handleApplyThresholds = () => {
    fetchData(minSupport, minConfidence, selectedBasket);
  };

  const rules = result?.data?.rules || [];
  const frequentItemsets = result?.data?.frequentItemsets || [];
  const availableProducts = result?.data?.availableProducts || [];
  const basketRecommendations = result?.data?.basketRecommendations || [];
  const totalTransactions = result?.data?.totalTransactions || 0;

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Buy-Together Insights — Products Customers Buy Together"
        subtitle="Discovers which products are frequently purchased together, so you can cross-sell, bundle, or arrange them nearby in your store."
        paradigm="Buy-Together Insights"
      />

      {/* Cart Simulation */}
      <Card
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(55, 48, 163, 0.2) 100%)'
            : 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE'}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <ShoppingBag sx={{ color: '#7C3AED', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={800} color="text.primary">
              What Else Might the Customer Buy?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select products in the customer's cart and see what other items they typically also buy
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <FormControl fullWidth size="small">
              <InputLabel id="basket-select-label">Customer's Cart (Select Products)</InputLabel>
              <Select
                labelId="basket-select-label"
                multiple
                value={selectedBasket}
                onChange={handleBasketChange}
                input={<OutlinedInput label="Customer's Cart (Select Products)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((val) => (
                      <Chip key={val} label={val} size="small" sx={{ fontWeight: 700, bgcolor: '#EDE9FE', color: '#6D28D9' }} />
                    ))}
                  </Box>
                )}
                sx={{ borderRadius: 2, bgcolor: theme.palette.background.paper }}
              >
                {availableProducts.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Quick Preset Buttons */}
          <Grid item xs={12} md={5}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              Quick Examples:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const preset = ['Basmati Rice Premium 5kg', 'Toor Dal Supreme 1kg'];
                  setSelectedBasket(preset);
                  fetchData(minSupport, minConfidence, preset);
                }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
              >
                Rice + Dal
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const preset = ['Tata Tea Gold 500g', 'Full Cream Milk 1L'];
                  setSelectedBasket(preset);
                  fetchData(minSupport, minConfidence, preset);
                }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
              >
                Tea + Milk
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const preset = ['Sunflower Cooking Oil 1L'];
                  setSelectedBasket(preset);
                  fetchData(minSupport, minConfidence, preset);
                }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
              >
                Cooking Oil
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Recommendations Result */}
        {selectedBasket.length > 0 && (
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle2" fontWeight={800} color="#7C3AED" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
              <AutoAwesome fontSize="small" /> Suggested Products to Offer This Customer:
            </Typography>

            {basketRecommendations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Not enough buying pattern data for this product combination yet. Try different products or add more sales history.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {basketRecommendations.map((rec, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        bgcolor: theme.palette.background.paper,
                        height: '100%',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                        {rec.item}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
                        <Chip
                          label={`${rec.maxLift}x more likely`}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#EDE9FE', color: '#6D28D9' }}
                        />
                        <Chip
                          label={`${(rec.maxConfidence * 100).toFixed(0)}% chance`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: '#D1FAE5', color: '#065F46' }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {rec.matchedRules[0]?.insight}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Card>

      {/* Sensitivity Controls */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Minimum Occurrence Rate: {(minSupport * 100).toFixed(1)}% of all bills
            </Typography>
            <Slider
              value={minSupport}
              min={0.01}
              max={0.2}
              step={0.01}
              onChange={(e, val) => setMinSupport(val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
              sx={{ color: '#7C3AED' }}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Minimum Confidence: {(minConfidence * 100).toFixed(0)}% (how often the rule holds true)
            </Typography>
            <Slider
              value={minConfidence}
              min={0.05}
              max={0.8}
              step={0.05}
              onChange={(e, val) => setMinConfidence(val)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
              sx={{ color: '#3B82F6' }}
            />
          </Grid>
          <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              onClick={handleApplyThresholds}
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                width: '100%',
              }}
            >
              Apply
            </Button>
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
          {/* Buy-Together Rules Table */}
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Buy-Together Patterns Found</Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on {totalTransactions} real customer bills — "If customer buys A, they also buy B"
                </Typography>
              </Box>
              <Chip label={`${rules.length} Patterns`} size="small" sx={{ fontWeight: 700 }} />
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>If Customer Buys → They Also Buy</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>How Often (%)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Chance (%)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Strength</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Suggested Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={800} color="#3B82F6">
                            {rule.antecedentStr}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">→</Typography>
                          <Typography variant="body2" fontWeight={800} color="#7C3AED">
                            {rule.consequentStr}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{rule.support}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#10B981' }}>
                        {(rule.confidence * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${rule.lift}x`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: rule.lift >= 1.5 ? '#EDE9FE' : 'action.hover',
                            color: rule.lift >= 1.5 ? '#6D28D9' : 'text.primary',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                        {rule.insight}
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
