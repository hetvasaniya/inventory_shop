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
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { NAVBAR_HEIGHT } from '../../utils/constants';
import toast from 'react-hot-toast';

const Navbar = ({ onMenuClick, onSidebarToggle, sidebarOpen }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, shop, logout, isWorkerMode, setSessionMode } = useAuth();
  const { mode, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

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

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        bgcolor: alpha(theme.palette.background.default, 0.8),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.appBar,
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
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
