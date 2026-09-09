// Total access.
//
// The backend used to decide this from the role NAME 'SUPER_ADMIN', and the browser mirrored
// that in four separate places. It is now the '*' grant: a row somebody issued, which a shop
// can move to a differently named role without the UI going blank.
//
// The role name is still accepted as a fallback, and only until the grant has been issued
// everywhere -- it can be deleted once no session predates that migration.
export const WILDCARD_PERMISSION = '*';

export function holdsEverything(user) {
  return (user?.permissions || []).includes(WILDCARD_PERMISSION)
    || (user?.roles || []).includes('SUPER_ADMIN');
}
