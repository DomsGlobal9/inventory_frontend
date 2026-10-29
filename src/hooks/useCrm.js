import { useAuth } from '../context/AuthContext';

/**
 * ScaleEzy CRM, from Inventory's side (PLAN-crm.md §7).
 *
 * `on` when the shop has switched CRM on (the session's `modules` lists 'crm') AND this build knows
 * where CRM lives (VITE_CRM_APP_URL). Only then do screens offer an "Open in CRM" link to the customer's
 * full profile. The counter itself (card, check-ins, notes) stays in Inventory for every shop (28 Oct):
 * salespeople keep their Inventory sign-in, and what they do reaches CRM through the change feed.
 *
 * `profileMoved` (29 Oct): CRM changes this shop's customers' WhatsApp offers answer, birthday and
 * anniversary, and deletes customers (session crmMoved.profile, set by CRM). Inventory then shows them
 * read only with a link to the customer in CRM.
 */
const CRM_APP = String(import.meta.env.VITE_CRM_APP_URL ?? '').trim().replace(/\/+$/, '');

export function useCrm() {
  const { user } = useAuth();
  const on = !!CRM_APP && Array.isArray(user?.modules) && user.modules.includes('crm');
  return {
    on,
    profileMoved: on && user?.crmMoved?.profile === true,
    /** This customer's page in CRM, found by their Inventory id. */
    customerUrl: (inventoryCustomerId) => (on && inventoryCustomerId ? `${CRM_APP}/customers/from/inventory/${encodeURIComponent(inventoryCustomerId)}` : null)
  };
}
