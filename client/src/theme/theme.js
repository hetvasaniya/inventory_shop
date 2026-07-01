import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: '#1976D2' },
    secondary: { main: '#00BCD4' },
    background: {
      default: mode === 'dark' ? '#0A1929' : '#F5F5F5',
      paper: mode === 'dark' ? '#112233' : '#FFFFFF',
    },
    success: { main: '#4CAF50' },
    warning: { main: '#FF9800' },
    error: { main: '#F44336' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, backgroundImage: 'none' },
      },
    },
  },
});
