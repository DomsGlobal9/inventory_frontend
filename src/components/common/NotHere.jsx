import React from 'react';
import { Link } from 'react-router-dom';

/**
 * What a detail page shows when the thing it opens is not there (17 Nov 2026).
 *
 * A removed customer, a deleted order, an old link: seven detail pages said only "Order not found" or "Error loading
 * customer details" in red, with no way on. One message now, in the app's words, always with the way back to the
 * list. A missing record (404, or a bad id: 400) is "not here", said calmly; anything else -- the internet, the server
 * -- is "could not load", with Try again, because nothing is lost.
 *
 *   <NotHere what="customer" back="/customers" backLabel="Back to customers" error={error} onRetry={refetch} />
 */
export default function NotHere({ what, back, backLabel, error, onRetry }) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const missing = !error || status === 404 || status === 400;
  return (
    <div role={missing ? undefined : 'alert'} style={{ padding: '72px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }}>
        {missing ? `This ${what} is not here` : `This ${what} could not load`}
      </h2>
      <p style={{ fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
        {missing ? 'It may have been deleted, or the link is out of date.' : 'Check the internet connection and try again. Nothing has been lost.'}
      </p>
      <div style={{ display: 'inline-flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!missing && <button type="button" className="btn-primary" onClick={() => (onRetry ? onRetry() : window.location.reload())}>Try again</button>}
        <Link to={back} className="btn-secondary" style={{ textDecoration: 'none' }}>{backLabel}</Link>
      </div>
    </div>
  );
}
