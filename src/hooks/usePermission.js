import { useAuth } from '../context/AuthContext';
import { holdsEverything } from '../lib/authority';

// usePermission().can('sales_order:confirm') -> boolean
// Reminder: this only controls what the UI shows. The backend re-checks every
// permission on every request — hiding a button here is UX, not security.
export function usePermission() {
  const { permissions, roles } = useAuth();

  const can = (permission) => {
    if (!permission) return true;
    // The account owner holds the '*' grant and passes everything. Implication is already
    // resolved server-side -- the session payload carries what the grants CONFER, not only
    // what was ticked -- so a plain includes() is the whole check for everyone else.
    if (holdsEverything({ permissions, roles })) return true;
    return permissions.includes(permission);
  };

  const canAny = (perms = []) => perms.some(can);

  return { can, canAny, permissions };
}
