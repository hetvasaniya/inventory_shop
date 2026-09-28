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
  CircularProgress,
  useTheme,
  alpha,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Compare,
  TrendingUp,
  Rule,
  Hub,
  InfoOutlined,
  CheckCircle,
  HelpOutline,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getModelComparison } from '../../services/aiService';
import toast from 'react-hot-toast';

export default function ModelComparisonPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getModelComparison();
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      toast.error('Failed to load performance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const regressionModels = result?.data?.regression?.models || [];
  const classificationModels = result?.data?.classification?.models || [];
  const clustering = result?.data?.clustering || {};
  const featureImportance = result?.data?.featureImportance || [];

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Prediction Performance Summary"
        subtitle="Shows how well the system predicts demand and stock risk — useful to understand how reliable the forecasts are."
        paradigm="Performance Summary"
      />

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
          {/* Section 1: Demand Forecast Accuracy */}
          <Card sx={{ borderRadius: 3, p: 2.5, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ color: '#3B82F6' }} /> Demand Forecast — How Accurate?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Comparing three different forecasting methods — lower error means better predictions
                </Typography>
              </Box>
              <Chip label="Sales Forecast" size="small" sx={{ fontWeight: 700 }} />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Prediction Method</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          <Tooltip title="Average Error in units per day (lower is better)">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                              Avg Error <HelpOutline sx={{ fontSize: 13 }} />
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          <Tooltip title="Root Mean Squared Error — penalizes large errors (lower is better)">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                              RMSE <HelpOutline sx={{ fontSize: 13 }} />
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          <Tooltip title="R² Score — how much of the variation it explains (higher = better, max 1.0)">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                              Accuracy Score <HelpOutline sx={{ fontSize: 13 }} />
                            </Box>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {regressionModels.map((m) => (
                        <TableRow key={m.model} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.model}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.type}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, color: '#3B82F6' }}>{m.mae}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, color: '#F59E0B' }}>{m.rmse}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: m.r2 >= 0.5 ? '#10B981' : '#6B7280' }}>
                            {m.r2}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={5}>
                <Box sx={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={regressionModels}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="model" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip />
                      <Legend />
                      <Bar dataKey="mae" name="Avg Error (Lower better)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rmse" name="RMSE (Lower better)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Section 2: Stock Risk Prediction Accuracy */}
          <Card sx={{ borderRadius: 3, p: 2.5, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rule sx={{ color: '#10B981' }} /> Stock Risk Prediction — How Reliable?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  How accurately the system identifies high, medium, and low risk products
                </Typography>
              </Box>
              <Chip label="Stock Risk" size="small" sx={{ fontWeight: 700 }} />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Prediction Method</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Approach</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Accuracy</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Precision</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Recall</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Overall Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classificationModels.map((m) => (
                        <TableRow key={m.model} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.model}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.type}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: '#10B981' }}>
                            {(m.accuracy * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{m.precision}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{m.recall}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: '#7C3AED' }}>{m.f1}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={5}>
                <Box sx={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={classificationModels}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                      <ChartTooltip />
                      <Legend />
                      <Bar dataKey="accuracy" name="Accuracy" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="f1" name="Overall Score" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Section 3: Product Grouping Quality & Key Factors */}
          <Grid container spacing={3}>
            {/* Product Grouping Quality */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Hub sx={{ color: '#8B5CF6' }} /> Product Grouping Quality
                    </Typography>
                    <Typography variant="caption" color="text.secondary">How well the system separates products into meaningful groups</Typography>
                  </Box>
                  <Chip label="Product Groups" size="small" sx={{ fontWeight: 700 }} />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, bgcolor: alpha('#8B5CF6', 0.08), borderRadius: 2, border: '1px solid rgba(139,92,246,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Grouping Quality Score</Typography>
                      <Typography variant="h4" fontWeight={800} color="#7C3AED">{clustering.silhouetteScore}</Typography>
                      <Typography variant="caption" color="text.secondary">How distinct the groups are (-1 to +1)</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ p: 2, bgcolor: alpha('#3B82F6', 0.08), borderRadius: 2, border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Group Tightness</Typography>
                      <Typography variant="h4" fontWeight={800} color="#2563EB">{clustering.inertia}</Typography>
                      <Typography variant="caption" color="text.secondary">Lower means groups are more compact</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    How to Read These Numbers:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • <strong>Score above 0.5:</strong> Products are clearly grouped — great results.<br />
                    • <strong>Score 0.25 - 0.5:</strong> Reasonable grouping with some overlap.<br />
                    • <strong>Group Tightness:</strong> Falls naturally as you add more groups.
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* Key Factors That Drive Predictions */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>What Drives the Predictions?</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Key factors the system uses to forecast demand and stock risk
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={featureImportance}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" domain={[0, 0.5]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="feature" width={160} tick={{ fontSize: 10 }} />
                      <ChartTooltip formatter={(val) => [`${(val * 100).toFixed(0)}%`, 'Impact']} />
                      <Bar dataKey="importance" name="Relative Impact" fill="#7C3AED" radius={[0, 4, 4, 0]} />
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
