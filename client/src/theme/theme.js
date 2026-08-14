import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#1976D2',
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00BCD4',
      light: '#33C9DC',
      dark: '#00838F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: mode === 'dark' ? '#0A1929' : '#F8FAFC',
      paper: mode === 'dark' ? '#112233' : '#FFFFFF',
    },
    text: {
      primary: mode === 'dark' ? '#F1F5F9' : '#0F172A',
      secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
    },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
          '& .MuiButton-startIcon, & .MuiButton-endIcon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          boxShadow: mode === 'dark' 
            ? '0 4px 20px rgba(0,0,0,0.4)' 
            : '0 2px 12px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          '& .MuiChip-icon': {
            marginLeft: '6px',
            marginRight: '-2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'background-color 0.2s ease, transform 0.1s ease',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
        head: {
          fontWeight: 700,
          backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
        },
      },
    },
  },
});
