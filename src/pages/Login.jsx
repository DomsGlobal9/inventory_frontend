import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, ArrowRight, Package, Building2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Only populated in the rare case where the same email+password combination
  // matches more than one workspace -- see auth.controller.ts's `login`.
  const [workspaceChoices, setWorkspaceChoices] = useState(null);

  const redirectTo = location.state?.from || '/';

  const attemptLogin = async (clientId) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password, clientId);
      if (result?.requiresWorkspaceSelection) {
        setWorkspaceChoices(result.workspaces);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await attemptLogin();
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* Background Animated Gradient Mesh */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 15% 50%, rgba(226, 193, 113, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 50% 100%, rgba(239, 68, 68, 0.05) 0%, transparent 60%)
        `,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Grid Pattern overlay for texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Login Card */}
      <div style={{
        width: '440px',
        maxWidth: '92vw',
        padding: '56px 48px',
        zIndex: 1,
        position: 'relative',
        background: 'rgba(10, 10, 12, 0.6)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #333333 0%, #111111 100%)',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: '#e2c171',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 8px 24px -4px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Package size={32} strokeWidth={1.5} />
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 600, 
            letterSpacing: '-0.03em', 
            margin: '0 0 12px',
            color: '#ffffff',
            textShadow: '0 2px 12px rgba(255,255,255,0.1)'
          }}>
            Scaleezy
          </h1>
          <p style={{ color: '#888888', fontSize: '15px', fontWeight: 400, letterSpacing: '0.01em' }}>
            Enterprise Inventory Platform
          </p>
        </div>

        {workspaceChoices ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#a1a1aa', fontSize: '14px', textAlign: 'center', margin: 0 }}>
              This email is used in more than one workspace. Choose which one to sign into.
            </p>
            {workspaceChoices.map(w => (
              <button
                key={w.clientId}
                onClick={() => attemptLogin(w.clientId)}
                disabled={isSubmitting}
                className="premium-input"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '0 16px', height: '52px',
                  background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                  color: '#ffffff', fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', textAlign: 'left'
                }}
              >
                <Building2 size={18} color="#666666" />
                {w.clientId}
              </button>
            ))}
            <button
              onClick={() => setWorkspaceChoices(null)}
              style={{ background: 'none', border: 'none', color: '#666666', fontSize: '13px', cursor: 'pointer', padding: '4px' }}
            >
              ← Back
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#a1a1aa', marginBottom: '8px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '16px', color: '#666666', pointerEvents: 'none', display: 'flex' }}>
                <Mail size={18} strokeWidth={2} />
              </div>
              <input
                type="email"
                className="premium-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                style={{ 
                  width: '100%',
                  padding: '0 16px 0 48px', 
                  height: '52px', 
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '15px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                autoFocus
                required
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#a1a1aa' }}>Password</label>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '16px', color: '#666666', pointerEvents: 'none', display: 'flex' }}>
                <Lock size={18} strokeWidth={2} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="premium-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ 
                  width: '100%',
                  padding: '0 48px 0 48px', 
                  height: '52px', 
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '15px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '16px', color: '#666666', 
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px'
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '14px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>!</div>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="premium-btn"
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              height: '52px',
              fontSize: '15px',
              marginTop: '8px',
              background: 'linear-gradient(135deg, #e2c171 0%, #c49a3c 100%)',
              color: '#000000',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px -6px rgba(226, 193, 113, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
              transition: 'all 0.2s ease',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Authorize Access
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '13px', color: '#555555', letterSpacing: '0.02em' }}>
            Secured by Scaleezy Gateway Authentication
          </p>
        </div>
      </div>
      
      <style>{`
        .premium-input:focus {
          border-color: rgba(226, 193, 113, 0.5) !important;
          background: rgba(255, 255, 255, 0.05) !important;
          box-shadow: 0 0 0 4px rgba(226, 193, 113, 0.1);
        }
        .premium-input::placeholder {
          color: #555555;
        }
        .premium-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -6px rgba(226, 193, 113, 0.5), inset 0 1px 0 rgba(255,255,255,0.4) !important;
        }
        .premium-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 12px -4px rgba(226, 193, 113, 0.3) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
