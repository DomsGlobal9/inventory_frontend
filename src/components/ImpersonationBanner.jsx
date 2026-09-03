import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { api } from '../lib/api';

const IMPERSONATION_KEY = 'scaleezy_platform_admin_impersonation';

export default function ImpersonationBanner() {
  const [impersonation] = useState(() => {
    try {
      const raw = localStorage.getItem(IMPERSONATION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  if (!impersonation) return null;

  const handleExit = async () => {
    try {
      await api.post(`/admin/sessions/${impersonation.sessionId}/end`);
    } catch (error) {
      // Even if ending the audit record fails, the admin must still be able to leave --
      // clear local state and route back to the console regardless.
    }
    localStorage.removeItem(IMPERSONATION_KEY);
    window.location.href = '/platformconsole/clients';
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #7c2d12 0%, #9a3412 100%)',
      color: '#fff', padding: '8px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '10px', fontSize: '13px', fontWeight: 500,
      flexShrink: 0
    }}>
      <ShieldAlert size={16} />
      Viewing as <strong style={{ fontFamily: 'monospace' }}>{impersonation.clientId}</strong> — Platform Admin session
      <button
        onClick={handleExit}
        style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
      >
        <X size={12} /> Exit to Console
      </button>
    </div>
  );
}
