import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  Chip,
  useTheme,
  alpha,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  DarkMode,
  LightMode,
  Notifications,
  Logout,
  Person,
  StorefrontRounded,
  PointOfSale,
  AdminPanelSettings,
  SmartToy,
  KeyboardArrowDown,
  DashboardCustomize,
  QueryStats,
  Category,
  Timeline,
  WarningAmber,
  Hub,
  AutoAwesome,
  Compare,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, NAVBAR_HEIGHT, AI_MENU } from '../../utils/constants';
import toast from 'react-hot-toast';

const aiIcons = {
  DashboardCustomize: <DashboardCustomize fontSize="small" sx={{ color: '#3B82F6' }} />,
  QueryStats: <QueryStats fontSize="small" sx={{ color: '#10B981' }} />,
  Category: <Category fontSize="small" sx={{ color: '#8B5CF6' }} />,
  Timeline: <Timeline fontSize="small" sx={{ color: '#EC4899' }} />,
  WarningAmber: <WarningAmber fontSize="small" sx={{ color: '#F59E0B' }} />,
  Hub: <Hub fontSize="small" sx={{ color: '#06B6D4' }} />,
  AutoAwesome: <AutoAwesome fontSize="small" sx={{ color: '#6366F1' }} />,
  Compare: <Compare fontSize="small" sx={{ color: '#14B8A6' }} />,
};

const Navbar = ({ onMenuClick, onSidebarToggle, sidebarOpen }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, shop, logout, isWorkerMode, setSessionMode } = useAuth();
  const { mode, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [aiAnchorEl, setAiAnchorEl] = useState(null);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAiOpen = (e) => setAiAnchorEl(e.currentTarget);
  const handleAiClose = () => setAiAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const currentDrawerWidth = sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        width: { md: `calc(100% - ${currentDrawerWidth}px)` },
        ml: { md: `${currentDrawerWidth}px` },
        transition: 'width 0.3s ease, margin 0.3s ease',
        bgcolor: alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ height: NAVBAR_HEIGHT, px: { xs: 1, sm: 2 } }}>
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { md: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {shop?.shopName || 'BizGrow Store'}
          </Typography>
        </Box>

        {/* 🤖 AI & Analytics Navbar Dropdown */}
        <Button
          variant="outlined"
          size="small"
          onClick={handleAiOpen}
          startIcon={<SmartToy sx={{ color: '#8B5CF6' }} />}
          endIcon={<KeyboardArrowDown sx={{ transition: 'transform 0.2s', transform: Boolean(aiAnchorEl) ? 'rotate(180deg)' : 'none' }} />}
          sx={{
            mr: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            background: alpha('#8B5CF6', 0.08),
            borderColor: alpha('#8B5CF6', 0.3),
            color: theme.palette.mode === 'dark' ? '#C4B5FD' : '#6D28D9',
            '&:hover': {
              background: alpha('#8B5CF6', 0.16),
              borderColor: '#8B5CF6',
            },
          }}
        >
          🤖 AI & Analytics
        </Button>

        {/* Session Mode Chip / Switch */}
        <Chip
          icon={isWorkerMode ? <PointOfSale fontSize="small" /> : <AdminPanelSettings fontSize="small" />}
          label={isWorkerMode ? 'Worker Mode (POS Only)' : 'Owner Mode'}
          color={isWorkerMode ? 'warning' : 'primary'}
          variant={isWorkerMode ? 'filled' : 'outlined'}
          size="small"
          onClick={() => {
            if (user?.role === 'owner') {
              const newMode = isWorkerMode ? 'owner' : 'worker';
              setSessionMode(newMode);
              if (newMode === 'worker') {
                toast.success('Switched to Worker Mode (Billing POS Only)');
                navigate('/billing');
              } else {
                toast.success('Switched to Owner Mode (Full Access)');
                navigate('/');
              }
            } else {
              toast.error('Only owner accounts can switch modes');
            }
          }}
          sx={{
            fontWeight: 600,
            mr: 1.5,
            cursor: user?.role === 'owner' ? 'pointer' : 'default',
            '&:hover': user?.role === 'owner' ? { opacity: 0.9 } : {},
          }}
        />

        {/* Theme Toggle */}
        <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
          <IconButton onClick={toggleTheme} sx={{ mr: 1 }}>
            {mode === 'dark' ? (
              <LightMode sx={{ color: '#FFB74D' }} />
            ) : (
              <DarkMode sx={{ color: '#5C6BC0' }} />
            )}
          </IconButton>
        </Tooltip>

        {/* User Avatar */}
        <Box
          onClick={handleMenuOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            py: 0.5,
            px: 1.5,
            borderRadius: 2,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: theme.palette.primary.main,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {isWorkerMode ? 'Cashier / Worker' : user?.role || 'Owner'}
            </Typography>
          </Box>
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/settings');
            }}
          >
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/settings');
            }}
          >
            <ListItemIcon>
              <StorefrontRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText>Shop Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>

        {/* 🤖 AI & Analytics Dropdown Menu */}
        <Menu
          anchorEl={aiAnchorEl}
          open={Boolean(aiAnchorEl)}
          onClose={handleAiClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1,
              width: 300,
              borderRadius: 2.5,
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))' }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <SmartToy fontSize="small" /> 🤖 AI & Analytics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Machine Learning & Decision Support System
            </Typography>
          </Box>
          <Divider />
          {AI_MENU.map((item) => (
            <MenuItem
              key={item.path}
              onClick={() => {
                handleAiClose();
                navigate(item.path);
              }}
              sx={{
                py: 1,
                px: 2,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {aiIcons[item.icon]}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                secondary={item.desc}
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
