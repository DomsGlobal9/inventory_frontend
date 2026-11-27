import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * What a tick box really does, said the moment it is ticked (27 Nov 2026). A saree was saved as a service by an
 * accidental tick: no stock, gone from Inventory, and the stock typed for it silently dropped. Every tick box that
 * changes what happens to stock, money or tax says so here, in the app's amber, right under the box.
 */
export default function TickWarning({ show, children, style }) {
  if (!show) return null;
  return (
    <div role="note" aria-live="polite" data-tick-warning
      style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '8px 0 0', padding: '9px 12px', borderRadius: '8px',
        background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', color: 'var(--text-primary)', fontSize: '12.5px', lineHeight: 1.45, ...style }}>
      <AlertTriangle size={15} style={{ color: '#b7791f', flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
