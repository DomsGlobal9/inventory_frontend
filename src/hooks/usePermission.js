import { useAuth } from '../context/AuthContext';

// usePermission().can('sales_order:confirm') -> boolean
// Reminder: this only controls what the UI shows. The backend re-checks every
// permission on every request — hiding a button here is UX, not security.
export function usePermission() {
  const { permissions, roles } = useAuth();

  const can = (permission) => {
    if (!permission) return true;
    // Mirror the backend's bypass (permission.middleware.ts): SUPER_ADMIN is never
    // assigned explicit RolePermission rows since the backend doesn't need them to
    // pass every check. Without this, SUPER_ADMIN's raw `permissions` array can be
    // empty/stale and every can()-gated nav item or button silently disappears for
    // the one role that should see everything.
    if (roles?.includes('SUPER_ADMIN')) return true;
    return permissions.includes(permission);
  };

  const canAny = (perms = []) => perms.some(can);

  return { can, canAny, permissions };
}
