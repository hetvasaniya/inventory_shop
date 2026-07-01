import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, NAVBAR_HEIGHT } from '../../utils/constants';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  const currentWidth = sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentWidth}px)` },
          ml: { md: `${currentWidth}px` },
          transition: 'margin 0.3s ease, width 0.3s ease',
        }}
      >
        <Navbar
          onMenuClick={toggleMobile}
          onSidebarToggle={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            pt: { xs: `${NAVBAR_HEIGHT + 16}px`, sm: `${NAVBAR_HEIGHT + 24}px` },
            minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
