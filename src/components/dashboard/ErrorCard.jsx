import React from 'react';
import { AlertTriangle } from 'lucide-react';
import NoAccess from '../NoAccess';
import { isPermissionError } from '../../lib/access';

/**
 * Something went wrong -- in red, with a triangle, because something did.
 *
 * Pass the `error` and a refusal is drawn as a closed door instead. A widget somebody is not
 * meant to see used to render here as "Widget Error", which reads as a broken app: an owner
 * files a bug, and a member of staff concludes the product is unreliable. Neither is true.
 */
export default function ErrorCard({ message = "Failed to load widget data", height = "400px", error }) {
  if (isPermissionError(error)) return <NoAccess error={error} height={height} />;

  return (
    <div className="stat-card" style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={24} />
      </div>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Widget Error</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
