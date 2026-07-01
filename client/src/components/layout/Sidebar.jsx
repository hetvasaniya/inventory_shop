import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  alpha,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  Inventory2,
  PointOfSale,
  Receipt,
  QrCode2,
  LocalShipping,
  LocalOffer,
  TrendingUp,
  Assessment,
  Settings,
  ChevronLeft,
  StorefrontRounded,
} from '@mui/icons-material';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, SIDEBAR_MENU } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

const iconMap = {
  Dashboard: <Dashboard />,
  Inventory2: <Inventory2 />,
  PointOfSale: <PointOfSale />,
  Receipt: <Receipt />,
  QrCode2: <QrCode2 />,
  LocalShipping: <LocalShipping />,
  LocalOffer: <LocalOffer />,
  TrendingUp: <TrendingUp />,
  Assessment: <Assessment />,
  Settings: <Settings />,
};

const Sidebar = ({ open, mobileOpen, onToggle, onMobileClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const currentWidth = open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onMobileClose();
  };

  const filteredMenu = SIDEBAR_MENU.filter(
    (item) => !item.ownerOnly || isOwner
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          p: 2,
          minHeight: 64,
        }}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1976D2 0%, #00BCD4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StorefrontRounded sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #1976D2, #00BCD4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '1.1rem',
                  lineHeight: 1.2,
                }}
              >
                H-Mart
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Retail Management
              </Typography>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton onClick={onToggle} size="small">
            <ChevronLeft
              sx={{
                transition: 'transform 0.3s',
                transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
              }}
            />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ opacity: 0.15 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 1.5 }}>
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path;
          const button = (
            <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2,
                  ...(isActive && {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.18),
                    },
                  }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: isActive ? theme.palette.primary.main : 'text.secondary',
                  }}
                >
                  {iconMap[item.icon]}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );

          return open ? (
            button
          ) : (
            <Tooltip key={item.title} title={item.title} placement="right" arrow>
              {button}
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentWidth,
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
