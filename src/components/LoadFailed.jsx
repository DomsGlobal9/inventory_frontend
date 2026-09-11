import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * What a screen shows when it could not ask, as opposed to when the answer was nothing.
 *
 * Every list in this app had one state for both. "No customers found.", "No suppliers
 * found.", "No transactions found." were printed with the same confidence whether the shop
 * genuinely had none or the request never arrived -- and a shopkeeper has no reason to doubt
 * an empty list. A global toast now says something went wrong, but the words in the middle of
 * the screen still said the opposite, and the words in the middle of the screen are the ones
 * people read.
 *
 * So: a failure says it failed, names what it was trying to load, and offers the only useful
 * action, which is to try again. It never claims the shelf is empty.
 *
 * `colSpan` makes it usable inside a <tbody>, where a <div> would be dropped by the HTML
 * parser -- several of these lists render their empty state as a table row, and the rest as a
 * block, so this has to do both rather than force nineteen screens into one markup.
 */
export default function LoadFailed({ what = 'this', error, onRetry, colSpan }) {
  const message =
    error?.message ||
    'Something went wrong reaching the server.';

  const body = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      padding: '40px 24px', textAlign: 'center'
    }}>
      <AlertTriangle size={22} style={{ color: 'var(--accent-danger)' }} />
      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
        Could not load {what}.
      </p>
      {/* The interceptor already turns timeouts and dropped connections into a sentence a
          shop owner can act on; anything else falls back to the server's own message. */}
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '420px' }}>
        {message}
      </p>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
        This is not the same as having none — nothing has been lost.
      </p>
      {onRetry && (
        <button
          className="btn-secondary"
          onClick={onRetry}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}
        >
          <RotateCw size={14} />
          Try again
        </button>
      )}
    </div>
  );

  if (colSpan) {
    return <tr><td colSpan={colSpan} style={{ padding: 0 }}>{body}</td></tr>;
  }
  return body;
}
