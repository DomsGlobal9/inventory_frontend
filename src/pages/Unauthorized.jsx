import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
      textAlign: 'center',
      color: 'var(--text-secondary)',
    }}>
      <ShieldAlert size={48} style={{ marginBottom: '16px', color: 'var(--warning-color, #f59e0b)' }} />
      <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Access denied</h2>
      <p style={{ margin: '0 0 24px', maxWidth: '400px' }}>
        Your account doesn't have permission to view this page. If you think this is a mistake, ask an administrator to update your role.
      </p>
      <button className="btn-primary" onClick={() => navigate('/')}>Back to Dashboard</button>
    </div>
  );
}
