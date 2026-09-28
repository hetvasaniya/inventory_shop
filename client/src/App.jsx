import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import InventoryPage from './pages/InventoryPage';
import BillingPage from './pages/BillingPage';
import BillHistoryPage from './pages/BillHistoryPage';
import StickerPrintPage from './pages/StickerPrintPage';
import SupplierPage from './pages/SupplierPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import CouponPage from './pages/CouponPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// AI & Analytics Pages
import AiDashboardPage from './pages/ai/AiDashboardPage';
import NumericalAnalysisPage from './pages/ai/NumericalAnalysisPage';
import CategoryAnalysisPage from './pages/ai/CategoryAnalysisPage';
import DemandForecastPage from './pages/ai/DemandForecastPage';
import StockRiskPage from './pages/ai/StockRiskPage';
import ProductSegmentationPage from './pages/ai/ProductSegmentationPage';
import ProductRecommendationsPage from './pages/ai/ProductRecommendationsPage';
import ModelComparisonPage from './pages/ai/ModelComparisonPage';

const queryClient = new QueryClient();

function App() {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: mode === 'dark' ? '#1E3A5F' : '#aef9f8',
              color: mode === 'dark' ? '#F1F5F9' : '#1A1208',
              border: mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(26,18,8,0.22)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="bills" element={<BillHistoryPage />} />
              <Route path="stickers" element={<StickerPrintPage />} />
              <Route path="suppliers" element={<SupplierPage />} />
              <Route path="purchase-orders" element={<ProtectedRoute ownerOnly><PurchaseOrdersPage /></ProtectedRoute>} />
              <Route path="coupons" element={<ProtectedRoute ownerOnly><CouponPage /></ProtectedRoute>} />
              <Route path="sales" element={<ProtectedRoute ownerOnly><ReportsPage /></ProtectedRoute>} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* 🤖 AI & Analytics Routes */}
              <Route path="ai" element={<Navigate to="/ai/dashboard" replace />} />
              <Route path="ai/dashboard" element={<ProtectedRoute ownerOnly><AiDashboardPage /></ProtectedRoute>} />
              <Route path="ai/numerical-analysis" element={<ProtectedRoute ownerOnly><NumericalAnalysisPage /></ProtectedRoute>} />
              <Route path="ai/category-analysis" element={<ProtectedRoute ownerOnly><CategoryAnalysisPage /></ProtectedRoute>} />
              <Route path="ai/demand-forecast" element={<ProtectedRoute ownerOnly><DemandForecastPage /></ProtectedRoute>} />
              <Route path="ai/stock-risk" element={<ProtectedRoute ownerOnly><StockRiskPage /></ProtectedRoute>} />
              <Route path="ai/segmentation" element={<ProtectedRoute ownerOnly><ProductSegmentationPage /></ProtectedRoute>} />
              <Route path="ai/recommendations" element={<ProtectedRoute ownerOnly><ProductRecommendationsPage /></ProtectedRoute>} />
              <Route path="ai/model-comparison" element={<ProtectedRoute ownerOnly><ModelComparisonPage /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
