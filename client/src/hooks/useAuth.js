import { useAuthStore } from '../store/authStore';

const useAuth = () => {
  const {
    user,
    token,
    shop,
    isAuthenticated,
    login,
    logout,
  } = useAuthStore();

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isCashier = user?.role === 'cashier';
  const hasManageAccess = isOwner || isManager;

  return {
    user,
    token,
    shop,
    isAuthenticated,
    isOwner,
    isManager,
    isCashier,
    hasManageAccess,
    login,
    logout,
  };
};

export default useAuth;
