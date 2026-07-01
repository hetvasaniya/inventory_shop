import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ProtectedRoute = ({ children, ownerOnly = false }) => {
  const { isAuthenticated, isOwner } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (ownerOnly && !isOwner) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
