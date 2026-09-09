import React from 'react';
import NoAccess from '../components/NoAccess';

/**
 * Landed somewhere their role does not reach -- a bookmark, a link a colleague sent, a role
 * that changed since they last looked.
 *
 * This used to be a red-orange "Access denied" with a "Back to Dashboard" button, which was a
 * trap: somebody without dashboard:view was sent to a page that would bounce them straight
 * back here. NoAccess works out a page they can actually open from what they hold.
 */
export default function Unauthorized() {
  return (
    <NoAccess
      variant="page"
      message="This part of the app isn't part of your role. Ask whoever manages your team if you need it."
    />
  );
}
