import React from 'react';

export default function PlaceholderPage({ title }) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>This module is currently under development.</p>
      </div>
      
      <div className="glass-panel" style={{ padding: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-light)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Coming Soon</p>
      </div>
    </div>
  );
}
