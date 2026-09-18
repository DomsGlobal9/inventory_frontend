import React from 'react';

// What each state is called on screen, and its colour. Shared with the count's own page.
const COUNT_STATUS = {
  DRAFT: { label: 'DRAFT', bg: 'rgba(156, 163, 175, 0.1)', fg: 'var(--text-secondary)' },
  IN_PROGRESS: { label: 'IN PROGRESS', bg: 'rgba(245, 158, 11, 0.1)', fg: 'var(--accent-gold)' },
  COMPLETED: { label: 'COMPLETED', bg: 'rgba(16, 185, 129, 0.1)', fg: 'var(--accent-success)' },
  CANCELLED: { label: 'CANCELLED', bg: 'rgba(239, 68, 68, 0.08)', fg: 'var(--accent-danger)' }
};

export default function StatusPill({ status, small = false }) {
  const look = COUNT_STATUS[status] || COUNT_STATUS.DRAFT;
  return (
    <span style={{
      padding: small ? '2px 8px' : '4px 8px', borderRadius: '4px', fontSize: small ? '11px' : '12px', fontWeight: small ? '600' : '500',
      backgroundColor: look.bg, color: look.fg, whiteSpace: 'nowrap'
    }}>
      {look.label}
    </span>
  );
}
