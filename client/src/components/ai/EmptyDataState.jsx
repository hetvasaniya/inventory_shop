import {
  Paper,
  Box,
  Typography,
  Alert,
  AlertTitle,
  useTheme,
  alpha,
} from '@mui/material';
import {
  WarningAmber,
  InfoOutlined,
  TrendingUp,
} from '@mui/icons-material';

export default function EmptyDataState({
  reason = 'Not enough sales history available yet.',
  minimumRequirement = 'At least 14 days of sales history and 15 completed bills are needed.',
}) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 3,
        textAlign: 'center',
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
        maxWidth: 700,
        mx: 'auto',
        my: 4,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2.5,
        }}
      >
        <WarningAmber sx={{ fontSize: 36, color: theme.palette.warning.main }} />
      </Box>

      <Typography variant="h6" fontWeight={800} color="text.primary" gutterBottom>
        Not enough sales data yet for predictions
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
        The Analytics section only uses your real shop sales — it will start showing predictions
        and insights automatically as you create more bills.
      </Typography>

      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          textAlign: 'left',
          borderRadius: 2,
          mb: 2,
          backgroundColor: alpha(theme.palette.info.main, 0.08),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>What's needed?</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Why:</strong> {reason}
        </Typography>
        <Typography variant="body2">
          <strong>Requirement:</strong> {minimumRequirement}
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
        <TrendingUp sx={{ color: '#7C3AED' }} />
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Keep billing — insights will appear automatically as your data grows.
        </Typography>
      </Box>
    </Paper>
  );
}
