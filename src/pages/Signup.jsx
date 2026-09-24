import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import AuthShell, { authField, authLabel, authPrimary } from '../components/AuthShell';

/*
 * This page styles itself with objects rather than classes -- see AuthShell, which exports
 * authField, authLabel and authPrimary. The three below keep the verify step in that language:
 * a class name invented here would simply not exist, which is exactly how the first attempt at
 * this came out as unstyled text sitting in the middle of the form.
 */

/*
 * One STEP, not three loose controls.
 *
 * The first attempt put a bare "Verify" pill under the email box with nothing to tie it to the
 * phone above it, and it read as an orphan: a button with no sentence explaining what pressing it
 * would do. This is a panel that belongs to the phone field -- it says what will happen, then
 * becomes the place the code is typed, then becomes the receipt. One object, three states.
 */
const step = (tone) => ({
  gridColumn: '1 / -1',
  marginTop: '-4px',
  padding: '14px 16px',
  borderRadius: '16px',
  border: `1px solid ${tone === 'done'
    ? 'color-mix(in srgb, var(--accent-success) 35%, transparent)'
    : 'var(--border-light)'}`,
  background: tone === 'done'
    ? 'color-mix(in srgb, var(--accent-success) 7%, transparent)'
    : 'var(--bg-input)',
  transition: 'background .2s ease, border-color .2s ease'
});

const stepRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap'
};

const stepWords = {
  flex: '1 1 190px',
  minWidth: 0,
  fontSize: '13.5px',
  lineHeight: 1.45,
  color: 'var(--text-secondary)'
};

/** Plainly not the button that submits: outlined, never the brand green. */
const quietButton = (busy, disabled) => ({
  height: '44px',
  padding: '0 20px',
  borderRadius: '999px',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '14.5px',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: disabled ? 'not-allowed' : busy ? 'wait' : 'pointer',
  opacity: disabled || busy ? 0.5 : 1,
  flex: '0 0 auto',
  whiteSpace: 'nowrap'
});

/*
 * The code box, which is worth not making an ordinary text field. Six characters, spaced out and
 * in the mono face, so somebody reading digits off a phone can see at a glance how many they have
 * typed and which one they are on.
 */
const codeBox = {
  width: '150px',
  height: '44px',
  padding: '0 14px',
  borderRadius: '12px',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '0.22em',
  textAlign: 'center',
  outline: 'none',
  flex: '0 0 auto'
};

const plainLink = {
  background: 'none',
  border: 0,
  padding: '10px 2px',
  color: 'var(--text-muted)',
  fontSize: '13px',
  fontFamily: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer',
  flex: '0 0 auto'
};

const quietNote = { margin: '10px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' };

const confirmedLine = {
  margin: 0,
  fontSize: '13.5px',
  fontWeight: 600,
  color: 'var(--accent-success)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

/** WhatsApp, drawn rather than named, so the panel says where the code is going at a glance. */
const WhatsAppMark = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
    style={{ flex: '0 0 auto', opacity: 0.75 }}>
    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.22-8.24 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.03 0 1.2.87 2.35.99 2.51.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

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

  /*
   * Confirming the number, so an enquiry carries a phone somebody can actually be reached on.
   *
   * The code goes out on WhatsApp from ScaleEzy's own number. The server decides whether it is
   * REQUIRED -- it refuses an unproved enquiry only while it could really have sent a code -- so
   * this asks rather than assumes, and a day when WhatsApp is down is a day the form still works
   * instead of a day nobody can sign up.
   */
  const [proof, setProof] = useState({ state: 'none', code: '', busy: false, said: '', forPhone: '' });
  const proved = proof.state === 'done' && proof.forPhone === form.phone.trim();
  /* Verify stays disabled until there is a number to send to, rather than failing on a press. */
  const enoughDigits = (form.phone.match(/\d/g) || []).length >= 7;

  const askForCode = async () => {
    const phone = form.phone.trim();
    if ((phone.match(/\d/g) || []).length < 7) {
      setErrors(e => ({ ...e, phone: 'A number we can reach you on.' }));
      return;
    }
    setProof(p => ({ ...p, busy: true, said: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/leads/verify/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setProof(p => ({ ...p, busy: false, said: body?.message || 'That could not be sent.' }));
        return;
      }
      setProof({
        state: body?.data?.alreadyVerified ? 'done' : 'sent',
        code: '', busy: false, forPhone: phone,
        said: body?.data?.alreadyVerified ? 'This number is already confirmed.' : 'We have sent a code to that number on WhatsApp.'
      });
    } catch {
      setProof(p => ({ ...p, busy: false, said: 'Could not reach the server. Check your connection.' }));
    }
  };

  const confirmCode = async () => {
    setProof(p => ({ ...p, busy: true, said: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/leads/verify/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone.trim(), code: proof.code })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setProof(p => ({ ...p, busy: false, said: body?.message || 'That code was not right.' }));
        return;
      }
      setProof(p => ({ ...p, state: 'done', busy: false, said: 'Number confirmed.', forPhone: form.phone.trim() }));
    } catch {
      setProof(p => ({ ...p, busy: false, said: 'Could not reach the server. Check your connection.' }));
    }
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
        /*
         * The one refusal that is not about the form: the number has not been confirmed. Sent to
         * the phone field and, if no code has gone yet, one is asked for straight away -- being
         * told to confirm a number with no way to start is a dead end.
         */
        if (/confirm your phone number/i.test(String(body?.message ?? ''))) {
          setErrors(e => ({ ...e, phone: 'Confirm this number first.' }));
          if (proof.state === 'none') void askForCode();
          return;
        }
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

          {/*
            Confirming the number, under the two fields it belongs to.

            Offered rather than demanded: the server decides whether an unproved enquiry is
            refused, and it only does so while it could really have sent a code. So somebody can
            ignore this and send the form -- and if the server does want it, submitting brings
            them straight back here with a code already on its way.
          */}
          <div style={step(proved ? 'done' : 'plain')}>
            {proved ? (
              <p style={confirmedLine}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {form.phone.trim()} verified
              </p>
            ) : proof.state === 'sent' ? (
              <div>
                {/* The sentence on its own line: at this width the label, the box and the button
                    could not share one, and Confirm wrapped underneath leaving a ragged row. */}
                <label htmlFor="signup-code" style={{ ...stepWords, display: 'block', flex: 'none', marginBottom: '10px' }}>
                  Enter the 6-digit code we sent to <strong style={{ color: 'var(--text-primary)' }}>{proof.forPhone}</strong>
                </label>
                <div style={stepRow}>
                <input
                  id="signup-code" style={codeBox} inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} placeholder="······" value={proof.code} autoFocus
                  onChange={e => setProof(p => ({ ...p, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  /* Enter confirms, so somebody typing a code off their phone never reaches for the mouse. */
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (proof.code.length === 6 && !proof.busy) confirmCode(); } }}
                />
                <button type="button" style={quietButton(proof.busy, proof.code.length !== 6)}
                  disabled={proof.busy || proof.code.length !== 6} onClick={confirmCode}>
                  {proof.busy ? 'Checking…' : 'Confirm'}
                </button>
                <button type="button" style={plainLink} disabled={proof.busy} onClick={askForCode}>
                  Send again
                </button>
                </div>
              </div>
            ) : (
              <div style={stepRow}>
                <span style={{ ...stepWords, display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <WhatsAppMark />
                  We will send a code to this number on WhatsApp.
                </span>
                <button type="button" style={quietButton(proof.busy, !enoughDigits)}
                  disabled={proof.busy || !enoughDigits} onClick={askForCode}>
                  {proof.busy ? 'Sending…' : 'Verify'}
                </button>
              </div>
            )}
            {proof.said ? <p style={quietNote}>{proof.said}</p> : null}
          </div>

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
