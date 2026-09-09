import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import AuthShell, { authField, authLabel, authPrimary } from '../components/AuthShell';

/**
 * Signing up records an enquiry. It creates no account and no workspace.
 *
 * That is deliberate and the page says so, because a form that looks like it made you an
 * account and did not is the worst possible first impression: the visitor goes to sign in, is
 * refused, and concludes the product is broken before anyone has spoken to them.
 */
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
    if (form.companyName.trim().length < 2) next.companyName = 'Tell us what the shop is called.';
    if (form.contactName.trim().length < 2) next.contactName = 'And who we should ask for.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = "That does not look like an email address.";

    const phone = form.phone.trim();
    const digits = (phone.match(/\d/g) || []).length;
    if (!phone) next.phone = 'A number we can reach you on.';
    else if (!/^[\d\s+()-]+$/.test(phone)) next.phone = 'Digits, spaces and + only.';
    else if (digits < 7) next.phone = 'That is too short to be a phone number.';

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
        // The server names the field it rejected. Putting the message beside that field beats
        // one line at the bottom saying something on this form is wrong.
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

  const field = (key, label, props = {}, full = false) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, minWidth: 0 }}>
      <label htmlFor={key} style={authLabel}>{label}</label>
      <input
        id={key}
        className="auth-field"
        value={form[key]}
        onChange={set(key)}
        aria-invalid={errors[key] ? 'true' : undefined}
        style={{
          ...authField,
          borderColor: errors[key] ? 'var(--accent-danger)' : 'var(--border-light)'
        }}
        {...props}
      />
      {errors[key] && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--accent-danger)' }}>
          {errors[key]}
        </p>
      )}
    </div>
  );

  if (submitted) {
    return (
      <AuthShell
        eyebrow="Thank you"
        title="We have your details"
        subtitle="Someone will be in touch to set your shop up and move your stock across."
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{
            width: '58px', height: '58px', margin: '0 auto 20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
            color: 'var(--brand-ink)'
          }}>
            <CheckCircle2 size={28} strokeWidth={2} />
          </div>
          <p style={{ margin: '0 0 26px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
            Nothing has been created yet — this was an enquiry, not an account. We will set the
            shop up with you so the opening stock goes in properly the first time.
          </p>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
            height: '52px', padding: '0 30px', borderRadius: '999px',
            background: 'var(--brand-solid)', color: 'var(--brand-on-solid)',
            fontSize: '15.5px', fontWeight: 700, textDecoration: 'none'
          }}>
            Back to the site <ArrowRight size={17} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Request access"
      title="Tell us about your shop"
      subtitle="We set each shop up with you, so the stock you already hold goes in with its costs rather than as a pile of unvalued pieces."
      points={[
        'We move your opening stock in with you, not after you',
        'Nothing to install — it runs in the browser you already have',
        'Free to start, and no card to begin with'
      ]}
      footer={
        <>
          Already have a workspace?{' '}
          <Link to="/login" style={{ color: 'var(--brand-ink)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {field('companyName', 'Shop name', { placeholder: 'Your shop', autoComplete: 'organization', autoFocus: true }, true)}
          {field('contactName', 'Your name', { placeholder: 'Who we ask for', autoComplete: 'name' })}
          {field('phone', 'Phone', { placeholder: '+91 98765 43210', type: 'tel', autoComplete: 'tel' })}
          {field('email', 'Email', { placeholder: 'you@yourshop.com', type: 'email', autoComplete: 'email' }, true)}

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="message" style={authLabel}>
              Anything else <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="message"
              className="auth-field"
              value={form.message}
              onChange={set('message')}
              rows={3}
              placeholder="How many shops do you run, and roughly how much stock?"
              style={{ ...authField, height: 'auto', padding: '14px 18px', resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>
        </div>

        {submitError && (
          <div role="alert" style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '20px',
            padding: '13px 16px', borderRadius: '14px',
            background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-danger) 30%, transparent)',
            color: 'var(--accent-danger)', fontSize: '14px', lineHeight: 1.5
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{submitError}</span>
          </div>
        )}

        <div style={{ marginTop: '22px' }}>
          <button type="submit" className="auth-primary" disabled={isSubmitting} style={authPrimary(isSubmitting)}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {isSubmitting ? 'Sending…' : 'Send request'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </div>

        {/* Said before they press it, not after. */}
        <p style={{ margin: '14px 0 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          This sends us an enquiry. It does not create an account or charge anything.
        </p>
      </form>
    </AuthShell>
  );
}
