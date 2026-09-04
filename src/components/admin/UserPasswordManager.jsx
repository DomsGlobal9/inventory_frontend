import React, { useState } from 'react';
import { X, Eye, KeyRound, RefreshCw, Loader2, Mail, MessageCircle, Copy, Check } from 'lucide-react';
import { useAdminViewUserPassword, useAdminSetUserPassword } from '../../hooks/admin/useAdminConsole';
import { buildCredentialMailto, buildCredentialWhatsapp } from '../../lib/credentialShare';

function ShareRow({ recipientName, email, password }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser -- the password is still shown on
      // screen either way.
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <a href={buildCredentialMailto({ recipientName, email, tempPassword: password })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', textDecoration: 'none', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
        <Mail size={13} /> Email
      </a>
      <a href={buildCredentialWhatsapp({ recipientName, email, tempPassword: password })} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', textDecoration: 'none', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
        <MessageCircle size={13} /> WhatsApp
      </a>
      <button onClick={handleCopy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// Platform Console equivalent of the client-side Team & Users password manager -- the
// recovery path when a client's sole Super Admin forgets their password and nobody inside
// their own app can help them (Team & Users blocks managing your own row).
export default function UserPasswordManager({ user, onClose }) {
  const [revealed, setRevealed] = useState(null);
  const [mode, setMode] = useState('view');
  const [customPassword, setCustomPassword] = useState('');
  const viewMutation = useAdminViewUserPassword();
  const setMutation = useAdminSetUserPassword();

  const handleView = async () => {
    try {
      const result = await viewMutation.mutateAsync(user.id);
      setRevealed(result.password);
    } catch {
      // Toasted by the hook.
    }
  };

  const handleSet = async (auto) => {
    if (!auto && customPassword.length < 6) return;
    try {
      const result = await setMutation.mutateAsync({ userId: user.id, customPassword: auto ? undefined : customPassword });
      setRevealed(result.password);
      setMode('view');
      setCustomPassword('');
    } catch {
      // Toasted by the hook.
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-modal)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user.name}'s Password</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button onClick={() => { setMode('view'); setRevealed(null); }} style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${mode === 'view' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: mode === 'view' ? 'rgba(226, 193, 113, 0.1)' : 'transparent', color: mode === 'view' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>View Current</button>
          <button onClick={() => { setMode('set'); setRevealed(null); }} style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${mode === 'set' ? 'var(--accent-gold)' : 'var(--border-light)'}`, background: mode === 'set' ? 'rgba(226, 193, 113, 0.1)' : 'transparent', color: mode === 'set' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Set New</button>
        </div>

        {mode === 'view' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {revealed ? (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-input)', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                  {revealed}
                </div>
                <ShareRow recipientName={user.name} email={user.email} password={revealed} />
              </>
            ) : (
              <button onClick={handleView} disabled={viewMutation.isPending} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                {viewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Reveal Password
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" className="input-field" placeholder="New password (at least 6 characters)" value={customPassword} onChange={e => setCustomPassword(e.target.value)} minLength={6} />
            <button onClick={() => handleSet(false)} disabled={setMutation.isPending || customPassword.length < 6} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {setMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Set This Password
            </button>
            <button onClick={() => handleSet(true)} disabled={setMutation.isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <RefreshCw size={14} /> Or Auto-generate Instead
            </button>
            {revealed && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid var(--accent-gold)' }}>
                  New password: {revealed}
                </div>
                <ShareRow recipientName={user.name} email={user.email} password={revealed} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
