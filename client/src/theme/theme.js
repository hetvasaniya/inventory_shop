import { createTheme, alpha } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const FONT_FAMILY = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';

// Supported modes: 'light' | 'medium' | 'dark'
// 'medium' is a true neutral gray tone — not the warm cream of light mode,
// not the deep navy of dark mode.
const getDesignTokens = (mode) => ({
  palette: {
    mode: mode === 'medium' ? 'light' : mode, // MUI only knows light/dark internally
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
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#B45309',
      contrastText: '#1A1208',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0EA5E9',
      light: '#38BDF8',
      dark: '#0369A1',
      contrastText: '#FFFFFF',
    },
    background: {
      default:
        mode === 'dark' ? '#0A1929' : mode === 'medium' ? '#DCDDDF' : '#d8eacc40',
      paper:
        mode === 'dark' ? '#112233' : mode === 'medium' ? '#EAEBED' : '#FFFCF5',
    },
    text: {
      primary:
        mode === 'dark' ? '#F1F5F9' : mode === 'medium' ? '#2B2E33' : '#1A1208',
      secondary:
        mode === 'dark' ? '#94A3B8' : mode === 'medium' ? '#5E636B' : '#5C4A22',
      disabled:
        mode === 'dark'
          ? 'rgba(241,245,249,0.38)'
          : mode === 'medium'
          ? 'rgba(43,46,51,0.38)'
          : 'rgba(26,18,8,0.38)',
    },
    divider:
      mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : mode === 'medium'
        ? 'rgba(43, 46, 51, 0.14)'
        : 'rgba(90, 60, 10, 0.12)',
    action: {
      hover:
        mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : mode === 'medium'
          ? 'rgba(43,46,51,0.06)'
          : 'rgba(25,118,210,0.05)',
      selected:
        mode === 'dark'
          ? 'rgba(255,255,255,0.10)'
          : mode === 'medium'
          ? 'rgba(25,118,210,0.12)'
          : 'rgba(25,118,210,0.10)',
      disabled:
        mode === 'dark'
          ? 'rgba(255,255,255,0.28)'
          : mode === 'medium'
          ? 'rgba(43,46,51,0.28)'
          : 'rgba(26,18,8,0.28)',
      disabledBackground:
        mode === 'dark'
          ? 'rgba(255,255,255,0.10)'
          : mode === 'medium'
          ? 'rgba(43,46,51,0.10)'
          : 'rgba(26,18,8,0.08)',
      focus:
        mode === 'dark'
          ? 'rgba(255,255,255,0.14)'
          : mode === 'medium'
          ? 'rgba(25,118,210,0.16)'
          : 'rgba(25,118,210,0.14)',
    },
  },
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 800, fontSize: '3rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, fontSize: '2.375rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
    h4: { fontWeight: 800, fontSize: '1.625rem', lineHeight: 1.35 },
    h5: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.4 },
    h6: { fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.4 },
    subtitle1: { fontWeight: 600, fontSize: '1rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
});

// ---------------------------------------------------------------------------
// Component overrides (depends on resolved palette, so built from theme)
// ---------------------------------------------------------------------------
// `rawMode` is passed through separately since MUI's theme.palette.mode only
// knows 'light' | 'dark' — we need the real mode ('light' | 'medium' | 'dark')
// to pick the right shadows / surfaces for the neutral "medium" tone.
const getComponents = (theme, rawMode) => {
  const isDark = rawMode === 'dark';
  const isMedium = rawMode === 'medium';

  const cardShadow = isDark
    ? '0 4px 20px rgba(0,0,0,0.4)'
    : isMedium
    ? '0 3px 14px rgba(0,0,0,0.10)'
    : '0 2px 12px rgba(0,0,0,0.06)';

  const elevatedShadow = isDark
    ? '0 8px 28px rgba(0,0,0,0.5)'
    : isMedium
    ? '0 8px 24px rgba(0,0,0,0.14)'
    : '0 8px 24px rgba(0,0,0,0.10)';

  const tableHeadBg = isDark
    ? 'rgba(255,255,255,0.04)'
    : isMedium
    ? 'rgba(43,46,51,0.06)'
    : '#ac7a0c58';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        html: { scrollBehavior: 'smooth' },
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          background: theme.palette.divider,
          borderRadius: 8,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: alpha(theme.palette.text.secondary, 0.4),
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: theme.shape.borderRadius,
          fontWeight: 600,
          boxShadow: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 18px',
          transition: 'box-shadow .2s ease, transform .1s ease, background-color .2s ease',
          '&:hover': { boxShadow: cardShadow },
          '&:active': { transform: 'scale(0.98)' },
          '&.Mui-disabled': {
            backgroundColor: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled,
          },
          '& .MuiButton-startIcon, & .MuiButton-endIcon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
          },
        },
        sizeLarge: { padding: '10px 24px', fontSize: '0.9375rem' },
        sizeSmall: { padding: '5px 12px', fontSize: '0.8125rem' },
        containedPrimary: {
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          transition: 'background-color .2s ease, transform .1s ease',
          '&:hover': { backgroundColor: theme.palette.action.hover },
          '&:active': { transform: 'scale(0.95)' },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 12 },
        elevation1: { boxShadow: cardShadow },
        elevation3: { boxShadow: elevatedShadow },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: 'none',
          boxShadow: cardShadow,
          transition: 'box-shadow .25s ease, transform .25s ease',
        },
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        title: { fontWeight: 700, fontSize: '1.0625rem' },
        subheader: { fontSize: '0.8125rem' },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          '& .MuiChip-icon': { marginLeft: 6, marginRight: -2 },
        },
        outlined: { borderWidth: 1.5 },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: theme.shape.borderRadius,
          transition: 'border-color .2s ease, box-shadow .2s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.error.main,
          },
        },
        notchedOutline: { borderColor: theme.palette.divider },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          minHeight: 48,
          '&.Mui-selected': { color: theme.palette.primary.main },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? '#1E293B' : isMedium ? '#2B2E33' : '#1A1208',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '6px 10px',
        },
        arrow: { color: isDark ? '#1E293B' : isMedium ? '#2B2E33' : '#1A1208' },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: elevatedShadow,
          backgroundImage: 'none',
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '1.25rem' },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          boxShadow: elevatedShadow,
          border: `1px solid ${theme.palette.divider}`,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 6px',
          fontSize: '0.875rem',
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
          },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: 22 },
        thumb: { boxShadow: 'none' },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&.Mui-checked': { color: theme.palette.primary.main },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': { color: theme.palette.primary.main },
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 700, fontSize: '0.65rem' },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          backgroundColor: alpha(theme.palette.primary.main, 0.15),
        },
        bar: { borderRadius: 8 },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 500 },
        standardSuccess: { backgroundColor: alpha(theme.palette.success.main, 0.12) },
        standardWarning: { backgroundColor: alpha(theme.palette.warning.main, 0.12) },
        standardError: { backgroundColor: alpha(theme.palette.error.main, 0.12) },
        standardInfo: { backgroundColor: alpha(theme.palette.info.main, 0.12) },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: theme.palette.divider },
      },
    },

    MuiList: {
      styleOverrides: {
        root: { paddingTop: 4, paddingBottom: 4 },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
            '&:hover': { backgroundColor: theme.palette.action.selected },
          },
        },
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        },
      },
    },

    MuiSlider: {
      styleOverrides: {
        root: { height: 6 },
        thumb: {
          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.16)}`,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
          },
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: alpha('#000000', isDark ? 0.6 : isMedium ? 0.5 : 0.4) },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottomColor: theme.palette.divider,
        },
        head: {
          fontWeight: 700,
          backgroundColor: tableHeadBg,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
        },
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
// mode: 'light' | 'medium' | 'dark'
export const getTheme = (mode = 'light') => {
  let theme = createTheme(getDesignTokens(mode));
  theme = createTheme(theme, {
    components: getComponents(theme, mode),
  });
  return theme;
};

export default getTheme;