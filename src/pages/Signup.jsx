import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, Phone, Building2, User, MessageSquare, ArrowRight, Package, CheckCircle2, Check, Shield } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';

const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.05); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .signup-container {
    display: flex;
    min-height: 100vh;
    width: 100vw;
    background-color: #050505;
    color: #fff;
    font-family: 'Inter', -apple-system, sans-serif;
  }

  .left-pane {
    flex: 1;
    position: relative;
    display: none;
    overflow: hidden;
    background: #000;
  }

  @media (min-width: 1024px) {
    .left-pane {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 64px;
    }
  }

  .right-pane {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    position: relative;
    overflow-y: hidden;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    animation: float 20s ease-in-out infinite;
    z-index: 0;
  }
  .orb-1 {
    width: 600px;
    height: 600px;
    background: rgba(226, 193, 113, 0.12);
    top: -100px;
    left: -100px;
    animation-delay: 0s;
  }
  .orb-2 {
    width: 700px;
    height: 700px;
    background: rgba(16, 185, 129, 0.08);
    bottom: -200px;
    right: -100px;
    animation-delay: -5s;
  }
  .orb-3 {
    width: 500px;
    height: 500px;
    background: rgba(124, 58, 237, 0.1);
    top: 30%;
    left: 20%;
    animation-delay: -10s;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 80%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 80%);
    z-index: 1;
    pointer-events: none;
  }

  .glass-card {
    width: 100%;
    max-width: 520px;
    padding: 36px 40px;
    position: relative;
    z-index: 10;
    background: rgba(15, 15, 18, 0.7);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 1), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.5);
    animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .input-group {
    position: relative;
  }
  
  .input-group.full-width {
    grid-column: 1 / -1;
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
    padding-left: 4px;
    transition: color 0.3s ease;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 18px;
    color: #555;
    pointer-events: none;
    transition: all 0.3s ease;
    display: flex;
  }

  .premium-input {
    width: 100%;
    height: 48px;
    padding: 0 16px 0 48px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    color: #ffffff;
    font-size: 15px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
  }

  .premium-input:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .premium-input:focus {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(226, 193, 113, 0.5);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5), 0 0 0 4px rgba(226, 193, 113, 0.05);
  }

  .input-wrapper:focus-within .input-icon {
    color: #e2c171;
    transform: scale(1.1);
  }

  .premium-input.error {
    border-color: rgba(239, 68, 68, 0.5);
  }
  .premium-input.error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
  }

  textarea.premium-input {
    height: auto;
    padding: 12px 16px 12px 48px;
    resize: none;
  }

  .submit-btn {
    width: 100%;
    height: 52px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    background: linear-gradient(135deg, #e2c171 0%, #c4a14d 100%);
    color: #111;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.3);
    margin-top: 8px;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 12px 28px -6px rgba(226, 193, 113, 0.4);
  }
  
  .submit-btn:hover:not(:disabled) .btn-icon {
    transform: translateX(4px);
  }

  .btn-icon {
    transition: transform 0.3s ease;
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: #666;
    box-shadow: none;
    cursor: not-allowed;
  }

  .gold-gradient {
    background: linear-gradient(135deg, #fdf5d3 0%, #e2c171 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .error-text {
    color: #f87171;
    font-size: 12px;
    margin: 8px 0 0 4px;
    animation: slide-up 0.2s ease-out;
  }

  .feature-list {
    margin-top: 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    z-index: 10;
    animation: fade-in 1s ease-out 0.3s both;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  
  .feature-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #a1a1aa;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

export default function Signup() {
  const [form, setForm] = useState({
    companyName: '', contactName: '', email: '', phone: '', message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.companyName.trim().length < 2) next.companyName = 'Required.';
    if (form.contactName.trim().length < 2) next.contactName = 'Required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Invalid email.';

    const phone = form.phone.trim();
    const digits = (phone.match(/\d/g) || []).length;
    if (!phone) next.phone = 'Required.';
    else if (!/^[\d\s+()-]+$/.test(phone)) next.phone = 'Invalid format.';
    else if (digits < 7) next.phone = 'Too short.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          ...(form.message.trim() ? { message: form.message.trim() } : {})
        })
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const issues = body?.errors;
        if (Array.isArray(issues) && issues.length) {
          const mapped = {};
          for (const issue of issues) {
            const field = issue?.path?.[0];
            if (field && !mapped[field]) mapped[field] = issue.message;
          }
          setErrors(mapped);
          setSubmitError(Object.keys(mapped).length ? '' : (body?.message || 'Please check the form and try again.'));
        } else {
          setSubmitError(body?.message || 'Something went wrong. Please try again.');
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (key, label, Icon, inputProps = {}, isFullWidth = false) => (
    <div className={`input-group ${isFullWidth ? 'full-width' : ''}`}>
      <label className="input-label">{label}</label>
      <div className="input-wrapper">
        <div className="input-icon"><Icon size={18} strokeWidth={2} /></div>
        <input
          className={`premium-input ${errors[key] ? 'error' : ''}`}
          value={form[key]}
          onChange={set(key)}
          {...inputProps}
        />
      </div>
      {errors[key] && <p className="error-text">{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="signup-container">
        
        {/* LEFT PANE - VISUALS */}
        <div className="left-pane">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="grid-bg" />
          
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '500px', marginLeft: '10%' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '6px 14px', background: 'rgba(255,255,255,0.05)', 
              borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '32px', color: '#a1a1aa', fontSize: '13px', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              <Shield size={14} /> Enterprise Platform
            </div>
            
            <h1 style={{ fontSize: '52px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 24px' }}>
              Scale your operations with <br />
              <span className="gold-gradient">absolute precision.</span>
            </h1>
            
            <p style={{ color: '#a1a1aa', fontSize: '18px', lineHeight: 1.6, margin: 0, maxWidth: '420px' }}>
              Join the platform designed for enterprise inventory management, real-time analytics, and secure zero-trust architecture.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon"><Check size={16} strokeWidth={3} /></div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#fff' }}>Tenant-Isolated Security</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Your data is cryptographically separated and protected.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Check size={16} strokeWidth={3} /></div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#fff' }}>Unified Analytics</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Real-time insights across all your warehouses and channels.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Check size={16} strokeWidth={3} /></div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#fff' }}>API First Integration</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Connect your existing tools with our robust Gateway API.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE - FORM */}
        <div className="right-pane">
          <div className="orb orb-1" style={{ top: 'auto', bottom: '-20%', right: '-20%', left: 'auto', filter: 'blur(100px)' }} />
          
          <div className="glass-card">
            <div style={{ textAlign: 'left', marginBottom: submitted ? '20px' : '24px' }}>
              <div style={{
                width: '44px', height: '44px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 0 16px 0', color: '#e2c171',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 8px 24px -4px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {submitted ? <CheckCircle2 size={24} strokeWidth={1.5} /> : <Package size={24} strokeWidth={1.5} />}
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px', color: '#ffffff' }}>
                {submitted ? 'Request Received' : 'Request Access'}
              </h2>
              <p style={{ color: '#888888', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                {submitted
                  ? "Thanks — we've got your details. Someone from our team will contact you shortly to set up your workspace."
                  : 'Tell us about your business and we will get in touch.'}
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'left' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    height: '56px', padding: '0 32px', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff', fontSize: '15px', fontWeight: 600, textDecoration: 'none',
                    transition: 'all 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {field('companyName', 'Business Name', Building2, { type: 'text', placeholder: 'e.g. Meridian Silks', autoFocus: true })}
                  {field('contactName', 'Your Name', User, { type: 'text', placeholder: 'e.g. Ravi Menon' })}
                </div>
                
                {field('email', 'Email Address', Mail, { type: 'email', placeholder: 'you@yourbusiness.com' }, true)}
                {field('phone', 'Phone Number', Phone, { type: 'tel', placeholder: '+91 98765 43210' }, true)}

                <div className="input-group full-width" style={{ marginBottom: '20px' }}>
                  <label className="input-label">Anything else? <span style={{ color: '#555', textTransform: 'none' }}>(optional)</span></label>
                  <div className="input-wrapper">
                    <div className="input-icon" style={{ top: '14px' }}><MessageSquare size={18} strokeWidth={2} /></div>
                    <textarea
                      className="premium-input"
                      value={form.message}
                      onChange={set('message')}
                      placeholder="How many stores or warehouses do you run?"
                      rows={2}
                    />
                  </div>
                </div>

                {submitError && (
                  <div style={{
                    padding: '12px 14px', borderRadius: '10px', marginBottom: '20px',
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171', fontSize: '13px', animation: 'slide-up 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    {submitError}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="submit-btn">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isSubmitting ? 'Sending...' : 'Submit Request'}
                  {!isSubmitting && <ArrowRight size={18} strokeWidth={2.5} className="btn-icon" />}
                </button>
              </form>
            )}

            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>
                Already have a workspace?{' '}
                <Link to="/login" style={{ color: '#e2c171', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
