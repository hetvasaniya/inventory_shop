import {
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  SmartToy,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AI_MENU } from '../../utils/constants';

export default function AiHeader({ title, subtitle, paradigm }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = AI_MENU.findIndex((item) => item.path === location.pathname);

  const handleTabChange = (event, newValue) => {
    if (newValue >= 0 && newValue < AI_MENU.length) {
      navigate(AI_MENU[newValue].path);
    }
  };

  const paradigmColors = {
    'Sales Forecast': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    'Stock Risk Alert': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    'Product Groups': { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
    'Buy-Together Insights': { bg: '#FCE7F3', text: '#9D174D', border: '#F472B6' },
    'Sales Statistics': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    'Overview': { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
    'Performance Summary': { bg: '#CFFAFE', text: '#155E75', border: '#67E8F9' },
    'Category Breakdown': { bg: '#FEF9C3', text: '#713F12', border: '#FDE047' },
  };

  const badgeStyle = paradigmColors[paradigm] || { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Top Banner */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(88, 28, 135, 0.3) 100%)'
            : 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 100%)',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE'}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <SmartToy sx={{ fontSize: 22 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            {title}
          </Typography>
          {paradigm && (
            <Chip
              label={paradigm}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                backgroundColor: theme.palette.mode === 'dark' ? alpha(badgeStyle.border, 0.2) : badgeStyle.bg,
                color: theme.palette.mode === 'dark' ? '#E0E7FF' : badgeStyle.text,
                border: `1px solid ${badgeStyle.border}`,
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs
          value={currentTab !== -1 ? currentTab : 0}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'none',
              px: 2,
            },
          }}
        >
          {AI_MENU.map((item) => (
            <Tab key={item.path} label={item.title} />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
}
