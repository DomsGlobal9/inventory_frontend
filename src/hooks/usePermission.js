import { useAuth } from '../context/AuthContext';

// usePermission().can('sales_order:confirm') -> boolean
// Reminder: this only controls what the UI shows. The backend re-checks every
// permission on every request — hiding a button here is UX, not security.
export function usePermission() {
  const { permissions } = useAuth();

  const can = (permission) => {
    if (!permission) return true;
    return permissions.includes(permission);
  };

  const canAny = (perms = []) => perms.some(can);

  return { can, canAny, permissions };
}
