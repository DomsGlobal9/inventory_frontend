import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAdmin } from '../../context/PlatformAdminContext';
import { Loader2, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const { login } = usePlatformAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Force body background to match theme since this component mounts outside the main layout container sometimes
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--bg-dark)';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/platformconsole/clients', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-dark)', fontFamily: 'var(--font-sans)', padding: '20px'
    }}>
      <div style={{
        width: '420px', maxWidth: '100%', padding: '48px 40px',
        background: 'var(--bg-card)', 
        borderRadius: '24px', border: '1px solid var(--border-light)',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column', gap: '32px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', background: 'var(--bg-input)',
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: 'var(--accent-gold)', border: '1px solid var(--border-light)'
          }}>
            <ShieldCheck size={32} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, margin: '0 0 8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Scaleezy Platform</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cross-tenant platform administration</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="platform-admin@scaleezy.com" autoFocus required
                className="input-field"
                style={{ width: '100%', padding: '0 14px 0 42px', height: '48px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="input-field"
                style={{ width: '100%', padding: '0 42px 0 42px', height: '48px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={isSubmitting}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '48px', marginTop: '8px',
              background: 'var(--accent-gold)', color: '#000', fontWeight: 600, fontSize: '15px',
              borderRadius: '12px', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', 
              opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(226, 193, 113, 0.3)'
            }}
            onMouseOver={(e) => { if(!isSubmitting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(226, 193, 113, 0.4)'; } }}
            onMouseOut={(e) => { if(!isSubmitting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(226, 193, 113, 0.3)'; } }}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
