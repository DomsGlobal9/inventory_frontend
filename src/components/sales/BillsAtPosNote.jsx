import React from 'react';
import { Monitor } from 'lucide-react';

/**
 * Said where New sale would have been, for a store that bills at the POS.
 *
 * A button that quietly disappears reads as something broken. This says where selling moved to,
 * in one line, and that everything rung up there still arrives here.
 */
export default function BillsAtPosNote({ storeName, block = false }) {
  return (
    <div role="note" style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: block ? '18px 20px' : '10px 14px', borderRadius: '12px',
      border: '1px solid var(--border-light)', background: 'var(--bg-card)',
      color: 'var(--text-secondary)', fontSize: block ? '15px' : '13px', lineHeight: 1.5, maxWidth: block ? '560px' : '340px'
    }}>
      <Monitor size={block ? 20 : 16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-primary)' }} />
      <span>
        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{storeName} bills at the POS.</strong>{' '}
        Make the sale on the till. It shows up here, takes the stock out and reaches the Day Book on its own.
      </span>
    </div>
  );
}
