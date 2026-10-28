import { useAuth } from '../context/AuthContext';

/**
 * ScaleEzy CRM, from Inventory's side (PLAN-crm.md §7).
 *
 * `on` when the shop has switched CRM on (the session's `modules` lists 'crm') AND this build knows
 * where CRM lives (VITE_CRM_APP_URL). Only then do screens swap a moved feature (notes, what they looked
 * at online) for "Open in CRM". Either missing: every screen stays exactly as it was.
 */
const CRM_APP = String(import.meta.env.VITE_CRM_APP_URL ?? '').trim().replace(/\/+$/, '');

export function useCrm() {
  const { user } = useAuth();
  const on = !!CRM_APP && Array.isArray(user?.modules) && user.modules.includes('crm');
  return {
    on,
    /** This customer's page in CRM, found by their Inventory id. */
    customerUrl: (inventoryCustomerId) => (on && inventoryCustomerId ? `${CRM_APP}/customers/from/inventory/${encodeURIComponent(inventoryCustomerId)}` : null)
  };
}
