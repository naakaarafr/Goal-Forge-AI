import { useAuthContext } from '@/contexts/AuthContext';
import { Permission, hasPermission, Role } from '@/lib/rbac/permissions';

export function usePermissions() {
  const { user } = useAuthContext();
  
  const isSuperuser = !!user?.is_superuser;
  const role = isSuperuser ? 'admin' : (user?.role?.toLowerCase() as Role);
  
  const checkPermission = (permission: Permission) => {
    if (isSuperuser) return true;
    return hasPermission(role, permission);
  };

  return {
    checkPermission,
    role,
    actualRole: role,
    isEmployee: role === 'employee',
    isManager: role === 'manager',
    isAdmin: role === 'admin' || isSuperuser,
  };
}
