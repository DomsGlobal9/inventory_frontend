import React from 'react';
import { usePermission } from '../hooks/usePermission';
import NoAccess from './NoAccess';

/**
 * A page somebody's role does not reach.
 *
 * Every business route was reachable by anyone signed in. The sidebar hid the links, and the
 * API refused the data, so nobody noticed -- until you follow a bookmark or a colleague's link
 * and the page renders anyway, with the data missing. The Purchase Orders screen greeted a
 * salesperson with an empty table and the words "No purchase orders found", which is not a
 * refusal. It is a false statement about the shop: there ARE purchase orders, and they are not
 * allowed to see them.
 *
 * That failure mode is worse than an error, because it is quiet and it is wrong. This makes the
 * page say what is actually true.
 *
 * The UI gate is not the security -- the backend refuses every one of these calls regardless.
 * It is here so the screen tells the truth.
 */
export default function Guard({ permission, children }) {
  const { can } = usePermission();
  if (permission && !can(permission)) {
    return <NoAccess variant="page" message="This part of the app isn't part of your role. Ask whoever manages your team if you need it." />;
  }
  return children;
}
