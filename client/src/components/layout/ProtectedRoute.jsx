import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ProtectedRoute = ({ children, ownerOnly = false }) => {
  const { isAuthenticated, isOwner, isWorkerMode } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If worker mode is active, only allow /billing and /bills
  const allowedWorkerPaths = ['/billing', '/bills'];
  if (isWorkerMode && !allowedWorkerPaths.includes(location.pathname)) {
    return <Navigate to="/billing" replace />;
  }

  if (ownerOnly && !isOwner) {
    return <Navigate to={isWorkerMode ? '/billing' : '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
