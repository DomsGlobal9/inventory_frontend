/**
 * What someone sees when they are not allowed to see something.
 *
 * "Not allowed" is not an error. It is a normal, expected state of a product where different
 * people do different jobs, and it should read that way: no red, no warning triangle, no
 * "something went wrong". The person did nothing wrong and there is nothing for them to retry.
 *
 * What broke before, and what each piece here prevents:
 *
 *   - A widget the person cannot see showed a red "Widget Error", which reads as a broken app.
 *     A shop owner seeing that files a bug; a member of staff assumes the product is unreliable.
 *   - Several such widgets on one page produced a stack of identical red toasts.
 *   - React Query retried every one of them once, so each refusal cost two requests.
 *   - The dead end: /unauthorized offered "Back to Dashboard" to somebody who might not have
 *     dashboard:view either, which loops them straight back.
 *   - Login always went to /dashboard, so a role without it hit a wall on its first screen.
 */

/**
 * Was this refused for permission, as opposed to genuinely failing?
 *
 * The server sends `requiredPermission` with every 403 from requirePermission, which is what
 * makes the two tellable apart. A 403 without it is something else -- a disabled account, a
 * tenant mismatch -- and is left to be handled as the error it is.
 */
export function isPermissionError(error) {
  if (!error) return false;
  // The api interceptor rejects with the response BODY, not the axios error -- see the last
  // line of lib/api.ts. So what a component catches is { success, message, requiredPermission }
  // with no `response` on it at all. Both shapes are accepted because a few callers still see
  // the raw axios error, and a check that silently matched neither is worse than useless: it
  // reads as "this is a real failure" and paints the screen red.
  if (error.requiredPermission) return true;
  const res = error.response;
  return res?.status === 403 && !!res?.data?.requiredPermission;
}

/**
 * The sentence to show. The server already wrote it in the words the person needs -- "You do
 * not have permission to: see money reports. Ask whoever manages your team." -- so it is not
 * rewritten here into something vaguer.
 */
export function permissionMessage(error, fallback = 'You do not have access to this.') {
  return error?.message || error?.response?.data?.message || fallback;
}

/**
 * Where to send someone who has just logged in, or who has landed somewhere they cannot be.
 *
 * In the order a person would want them: the overview first, then the places they work, then
 * settings, which everyone can reach. Taking the first they can actually open means a role
 * without dashboard:view starts on Products rather than on a wall.
 */
const LANDING_ORDER = [
  { path: '/dashboard', permission: 'dashboard:view' },
  { path: '/products', permission: 'product:view' },
  { path: '/orders', permission: 'sales_order:view' },
  { path: '/inventory', permission: 'inventory:view' },
  { path: '/inventory/purchase-orders', permission: 'purchase_order:view' },
  { path: '/customers', permission: 'customer:view' },
  { path: '/returns', permission: 'return:view' },
  // Reachable by anyone signed in: it holds their own profile and their password. Somebody
  // with no permissions at all still has somewhere to be, rather than an empty screen.
  { path: '/settings', permission: null }
];

export function firstLandingPath(can) {
  const match = LANDING_ORDER.find(entry => can(entry.permission));
  return match ? match.path : '/settings';
}

/**
 * Whether a failed request is worth trying again.
 *
 * A refusal is not a blip. Retrying it doubles the requests, doubles the log noise, and delays
 * the moment the screen settles into telling the person the truth.
 */
export function shouldRetry(failureCount, error) {
  if (isPermissionError(error)) return false;
  const status = error?.response?.status ?? error?.statusCode;
  if (status === 401 || status === 404) return false;
  return failureCount < 1;
}
