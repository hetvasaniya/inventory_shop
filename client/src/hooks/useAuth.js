import { useAuthStore } from '../store/authStore';

const useAuth = () => {
  const {
    user,
    token,
    shop,
    isAuthenticated,
    sessionMode,
    setSessionMode,
    login,
    logout,
    setUser,
    setShop,
  } = useAuthStore();

  const isWorkerMode = sessionMode === 'worker' || user?.role === 'employee' || user?.role === 'cashier';
  const isOwner = user?.role === 'owner' && !isWorkerMode;
  const isManager = user?.role === 'manager' && !isWorkerMode;
  const hasManageAccess = isOwner || isManager;

  return {
    user,
    token,
    shop,
    isAuthenticated,
    sessionMode,
    setSessionMode,
    isWorkerMode,
    isOwner,
    isManager,
    isCashier: user?.role === 'cashier' || isWorkerMode,
    hasManageAccess,
    login,
    logout,
    setUser,
    setShop,
  };
};

export default useAuth;
