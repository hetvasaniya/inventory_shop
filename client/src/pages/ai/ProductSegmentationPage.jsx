import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Slider,
  CircularProgress,
  useTheme,
  alpha,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import {
  Hub,
  BubbleChart,
  Insights,
  CheckCircle,
  Lightbulb,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import AiHeader from '../../components/ai/AiHeader';
import EmptyDataState from '../../components/ai/EmptyDataState';
import { getProductSegmentation } from '../../services/aiService';
import toast from 'react-hot-toast';

const CLUSTER_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

export default function ProductSegmentationPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [k, setK] = useState(3);
  const [activeCluster, setActiveCluster] = useState(null);

  const fetchData = async (chosenK = k) => {
    setLoading(true);
    try {
      const res = await getProductSegmentation(chosenK);
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      toast.error('Failed to run product grouping analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleKChange = (event, newK) => {
    setK(newK);
    fetchData(newK);
  };

  const clusters = result?.data?.clusters || [];
  const scatterPlot = result?.data?.scatterPlot || [];
  const elbowCurve = result?.data?.elbowCurve || [];
  const silhouetteScore = result?.data?.silhouetteScore || 0;
  const inertia = result?.data?.inertia || 0;

  // Filter products by selected cluster
  const displayedProducts = [];
  clusters.forEach((cl) => {
    if (activeCluster === null || activeCluster === cl.clusterId) {
      cl.products.forEach((p) => {
        displayedProducts.push({
          ...p,
          clusterName: cl.profile?.name,
          tagColor: cl.profile?.tagColor,
          strategy: cl.profile?.strategy,
        });
      });
    }
  });

  return (
    <Box sx={{ pb: 5 }}>
      <AiHeader
        title="Product Groups & Performance Segments"
        subtitle="Automatically group your products by how they sell — helps identify star products, slow movers, and what needs attention."
        paradigm="Product Groups"
      />

      {/* Group Count Slider Control */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Number of Groups ({k} groups)</Typography>
              <Typography variant="caption" color="text.secondary">
                Adjust how many groups to split your products into (by sales volume and revenue)
              </Typography>
            </Box>
            <Box sx={{ px: 2, pt: 2 }}>
              <Slider
                value={k}
                min={2}
                max={6}
                step={1}
                marks={[
                  { value: 2, label: '2 Groups' },
                  { value: 3, label: '3 Groups' },
                  { value: 4, label: '4 Groups' },
                  { value: 5, label: '5 Groups' },
                  { value: 6, label: '6 Groups' },
                ]}
                onChange={handleKChange}
                disabled={loading}
                sx={{ color: '#7C3AED' }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: alpha('#7C3AED', 0.08), borderRadius: 2, border: '1px solid rgba(124,58,237,0.2)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Grouping Quality</Typography>
                <Typography variant="h5" fontWeight={800} color="#7C3AED">{silhouetteScore}</Typography>
                <Typography variant="caption" color="text.secondary">How well products are grouped (higher is better)</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, bgcolor: alpha('#3B82F6', 0.08), borderRadius: 2, border: '1px solid rgba(59,130,246,0.2)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Group Tightness</Typography>
                <Typography variant="h5" fontWeight={800} color="#2563EB">{inertia}</Typography>
                <Typography variant="caption" color="text.secondary">Lower means groups are more distinct</Typography>
              </Box>
            </Box>
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
          {/* Cluster Profile Cards */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Product Group Profiles
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {clusters.map((cl, idx) => (
              <Grid item xs={12} sm={6} md={4} key={cl.clusterId}>
                <Card
                  onClick={() => setActiveCluster(activeCluster === cl.clusterId ? null : cl.clusterId)}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    cursor: 'pointer',
                    height: '100%',
                    border: `2px solid ${activeCluster === cl.clusterId ? CLUSTER_COLORS[idx % CLUSTER_COLORS.length] : theme.palette.divider}`,
                    bgcolor: alpha(CLUSTER_COLORS[idx % CLUSTER_COLORS.length], 0.04),
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip
                      label={`Group ${cl.clusterId + 1}`}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                        color: '#fff',
                      }}
                    />
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {cl.size} products ({cl.percentage}%)
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={800} color="text.primary" gutterBottom>
                    {cl.profile?.name}
                  </Typography>

                  <Box sx={{ mb: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Avg Sales:</strong> {cl.centroidMetrics?.totalSales} units | <strong>Revenue:</strong> ₹{cl.centroidMetrics?.revenue}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Avg Stock:</strong> {cl.centroidMetrics?.stock} units | <strong>Price:</strong> ₹{cl.centroidMetrics?.price}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Lightbulb sx={{ fontSize: 16, color: '#F59E0B', flexShrink: 0, mt: 0.2 }} />
                    <span><strong>Action:</strong> {cl.profile?.strategy}</span>
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Scatter Plot + Elbow Curve */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Products: Sales vs Revenue Chart</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Each dot is a product — color shows which group it belongs to
                    </Typography>
                  </Box>
                  <Chip label={`${k} Groups`} size="small" sx={{ fontWeight: 600 }} />
                </Box>

                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" dataKey="x_sales" name="Units Sold" unit=" units" tick={{ fontSize: 11 }} />
                      <YAxis type="number" dataKey="y_revenue" name="Revenue" unit=" ₹" tick={{ fontSize: 11 }} />
                      <ZAxis type="number" dataKey="price" range={[60, 300]} name="Price" />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(val, name) => [val, name]}
                      />
                      {clusters.map((cl, idx) => (
                        <Scatter
                          key={cl.clusterId}
                          name={cl.profile?.name}
                          data={scatterPlot.filter((p) => p.clusterId === cl.clusterId)}
                          fill={CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}
                        />
                      ))}
                      <Legend />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Optimal Groups Guide */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
                <Typography variant="h6" fontWeight={700}>Optimal Group Count Guide</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Shows where adding more groups stops being useful
                </Typography>

                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={elbowCurve}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="k" label={{ value: 'Groups', position: 'insideBottom', offset: -5 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="inertia" name="Tightness Score" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                  The "elbow" bend shows the best number of groups.
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Product Group Assignment Table */}
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Products by Group</Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeCluster !== null ? `Showing only Group ${activeCluster + 1} products` : 'Showing all products'}
                </Typography>
              </Box>
              {activeCluster !== null && (
                <Button size="small" onClick={() => setActiveCluster(null)} sx={{ textTransform: 'none' }}>
                  Show All Groups
                </Button>
              )}
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Product Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Group</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Total Sales</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Revenue (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Price (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedProducts.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.category}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={p.clusterName}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#10B981' }}>{p.metrics?.totalSales}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>₹{p.metrics?.revenue.toLocaleString()}</TableCell>
                      <TableCell align="right">{p.metrics?.stock}</TableCell>
                      <TableCell align="right">₹{p.metrics?.price}</TableCell>
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
