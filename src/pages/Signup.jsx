import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, Phone, Building2, User, MessageSquare, ArrowRight, Package, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';

/**
 * Public signup enquiry.
 *
 * This creates NO account and NO workspace -- it records a lead the platform team reviews
 * and contacts, and onboarding happens from the console once they accept. The copy says so
 * plainly, because a form headed "Sign up" that silently gives you nothing to log into is
 * worse than no form at all.
 *
 * Deliberately does not use the shared api client: that instance carries credentials and an
 * auth interceptor that redirects to /login on 401, neither of which makes sense for an
 * anonymous prospect who has no session to lose.
 */
const FIELD = {
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
};

const LABEL = { display: 'block', fontSize: '13px', fontWeight: 500, color: '#a1a1aa', marginBottom: '8px' };
const ICON_WRAP = { position: 'absolute', left: '16px', color: '#666666', pointerEvents: 'none', display: 'flex' };

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

  // Mirrors the server's rules so the common mistakes are caught without a round trip. The
  // server stays the authority -- this is convenience, not the guard.
  const validate = () => {
    const next = {};
    if (form.companyName.trim().length < 2) next.companyName = 'Enter your business name.';
    if (form.contactName.trim().length < 2) next.contactName = 'Enter your name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';

    const phone = form.phone.trim();
    const digits = (phone.match(/\d/g) || []).length;
    if (!phone) next.phone = 'Enter a phone number so we can reach you.';
    else if (!/^[\d\s+()-]+$/.test(phone)) next.phone = 'Use only digits, spaces and + ( ) -';
    else if (digits < 7) next.phone = 'Enter a valid phone number.';

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
        // Field-level issues come back as a Zod issue list; surface them against the fields
        // rather than as one opaque banner.
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

  const field = (key, label, Icon, inputProps = {}) => (
    <div style={{ position: 'relative' }}>
      <label style={LABEL}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={ICON_WRAP}><Icon size={18} strokeWidth={2} /></div>
        <input
          className="premium-input"
          value={form[key]}
          onChange={set(key)}
          style={{ ...FIELD, borderColor: errors[key] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)' }}
          {...inputProps}
        />
      </div>
      {errors[key] && (
        <p style={{ color: '#f87171', fontSize: '12px', margin: '6px 0 0' }}>{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: '#000000', position: 'relative',
      overflow: 'auto', padding: '40px 0',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(circle at 15% 50%, rgba(226, 193, 113, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 50% 100%, rgba(239, 68, 68, 0.05) 0%, transparent 60%)
        `,
        zIndex: 0, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{
        width: '480px', maxWidth: '92vw', padding: '48px', zIndex: 1, position: 'relative',
        background: 'rgba(10, 10, 12, 0.6)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: submitted ? '24px' : '36px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #333333 0%, #111111 100%)',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: '#e2c171',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 8px 24px -4px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {submitted ? <CheckCircle2 size={32} strokeWidth={1.5} /> : <Package size={32} strokeWidth={1.5} />}
          </div>
          <h1 style={{
            fontSize: '30px', fontWeight: 600, letterSpacing: '-0.03em',
            margin: '0 0 12px', color: '#ffffff'
          }}>
            {submitted ? 'Request received' : 'Request access'}
          </h1>
          <p style={{ color: '#888888', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            {submitted
              ? "Thanks -- we've got your details. Someone from our team will contact you shortly to set up your workspace."
              : 'Tell us about your business and we will get in touch to set up your workspace.'}
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                height: '52px', padding: '0 28px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff', fontSize: '15px', fontWeight: 500, textDecoration: 'none'
              }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {field('companyName', 'Business Name', Building2, {
              type: 'text', placeholder: 'e.g. Meridian Silks', autoFocus: true
            })}
            {field('contactName', 'Your Name', User, { type: 'text', placeholder: 'e.g. Ravi Menon' })}
            {field('email', 'Email Address', Mail, { type: 'email', placeholder: 'you@yourbusiness.com' })}
            {field('phone', 'Phone Number', Phone, { type: 'tel', placeholder: '+91 98765 43210' })}

            <div style={{ position: 'relative' }}>
              <label style={LABEL}>
                Anything else? <span style={{ color: '#555' }}>(optional)</span>
              </label>
              <div style={{ position: 'relative', display: 'flex' }}>
                <div style={{ ...ICON_WRAP, top: '16px' }}><MessageSquare size={18} strokeWidth={2} /></div>
                <textarea
                  className="premium-input"
                  value={form.message}
                  onChange={set('message')}
                  placeholder="How many stores or warehouses do you run?"
                  rows={3}
                  style={{ ...FIELD, height: 'auto', padding: '14px 16px 14px 48px', resize: 'vertical' }}
                />
              </div>
            </div>

            {submitError && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontSize: '13px'
              }}>
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: '52px', borderRadius: '12px', border: 'none', cursor: isSubmitting ? 'default' : 'pointer',
                background: isSubmitting ? 'rgba(255,255,255,0.15)' : '#ffffff',
                color: isSubmitting ? '#a1a1aa' : '#000000',
                fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {isSubmitting ? 'Sending...' : 'Request Access'}
              {!isSubmitting && <ArrowRight size={18} strokeWidth={2.5} />}
            </button>

            <p style={{ fontSize: '12px', color: '#555555', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              This sends an enquiry to our team -- it does not create an account yet.
            </p>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '13px', color: '#555555', margin: 0 }}>
            Already have a workspace?{' '}
            <Link to="/login" style={{ color: '#e2c171', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
