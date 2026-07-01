import os

BASE_DIR = r"d:\code\PROJECTS\shop\client\src"

files = {
    "store/authStore.js": """import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);""",
    "store/themeStore.js": """import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      mode: 'dark',
      toggleMode: () => set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'theme-storage' }
  )
);""",
    "services/api.js": """import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;""",
    "theme/theme.js": """import { createTheme } from '@mui/material/styles';

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
});""",
    "App.jsx": """import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './store/themeStore';
import { getTheme } from './theme/theme';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const queryClient = new QueryClient();

function App() {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              {/* Add more routes here */}
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;""",
    "main.jsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '@fontsource/inter';
import '@fontsource/jetbrains-mono';
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)""",
    "index.css": """body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}""",
    "pages/DashboardPage.jsx": """import { Box, Typography } from '@mui/material';
export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
    </Box>
  );
}""",
    "pages/LoginPage.jsx": """import { Box, Typography } from '@mui/material';
export default function LoginPage() {
  return (
    <Box>
      <Typography variant="h4">Login</Typography>
    </Box>
  );
}""",
    "pages/RegisterPage.jsx": """import { Box, Typography } from '@mui/material';
export default function RegisterPage() {
  return (
    <Box>
      <Typography variant="h4">Register</Typography>
    </Box>
  );
}"""
}

for filepath, content in files.items():
    full_path = os.path.join(BASE_DIR, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Generated frontend skeleton files.")
