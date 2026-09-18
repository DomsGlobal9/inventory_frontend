import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, QrCode, KeyRound, Loader2, Unlink, Send, BookOpen, RefreshCw } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { typedPhone } from '../../utils/phone';
import {
  useWhatsAppOverview, useLinkWhatsApp, useDisconnectWhatsApp, useSendWhatsAppTest,
  useSaveDayBookWhatsApp, useSendDayBookNow
} from '../../hooks/useWhatsApp';

/**
 * Settings > WhatsApp.
 *
 * The shop links its OWN WhatsApp number here, once: bills, purchase orders, goods receipts and
 * return notes are then sent from it, to its own customers and suppliers. Linking is the same as
 * WhatsApp Web -- the phone keeps working as normal.
 *
 * Below that, for the owner only: the nightly Day Book, which ScaleEzy sends from its own number
 * to the owner. Off until they switch it on; 10:00 pm unless they choose another time.
 */

// A QR lasts about 20 seconds on WhatsApp's side; a fresh one is asked for well before that.
const QR_REFRESH_MS = 18_000;
// Nobody stands in front of a QR for more than a few minutes; after this, "Start again".
const LINK_GIVE_UP_MS = 4 * 60_000;

const card = { border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', background: 'var(--bg-card)' };

function Steps({ method }) {
  const items = method === 'code'
    ? ['Open WhatsApp on the shop\'s phone.', 'Tap ⋮ (or Settings) → Linked devices → Link a device.', 'Tap "Link with phone number instead".', 'Type the code shown here.']
    : ['Open WhatsApp on the shop\'s phone.', 'Tap ⋮ (or Settings) → Linked devices → Link a device.', 'Point the phone at the code here.'];
  return (
    <ol style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      {items.map(s => <li key={s}>{s}</li>)}
    </ol>
  );
}

function LinkPanel({ onLinked }) {
  const link = useLinkWhatsApp();
  const [method, setMethod] = useState(null);
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [startedAt, setStartedAt] = useState(0);
  const [expired, setExpired] = useState(false);
  const { data: overview } = useWhatsAppOverview({ poll: Boolean(result) && !expired });
  const inFlight = useRef(false);
  // Bumped by Cancel: an answer that arrives after it belongs to a linking nobody is doing any more.
  const attempt = useRef(0);

  const start = async (how, number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const mine = attempt.current;
    try {
      const r = await link.mutateAsync({ method: how, phone: number });
      if (mine !== attempt.current) return;
      if (r?.status === 'CONNECTED') { onLinked?.(); return; }
      setResult(r);
      setExpired(false);
      setStartedAt(prev => prev || Date.now());
    } catch (err) {
      if (mine === attempt.current) toast.error(err?.message || 'Linking could not start. Please try again.');
    } finally {
      inFlight.current = false;
    }
  };

  // The phone finished linking: the overview says so on its next poll.
  useEffect(() => {
    if (result && overview?.account?.status === 'CONNECTED') {
      toast.success('WhatsApp linked. Bills and purchase orders will now go from this number.');
      setResult(null);
      setMethod(null);
      onLinked?.();
    }
  }, [overview?.account?.status, result, onLinked]);

  // Keep the QR fresh while someone is scanning; stop after a few minutes. Through a ref, so the
  // timer always calls the current start rather than the one from when it was set up.
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    if (method !== 'qr' || !result || expired) return undefined;
    const t = setInterval(() => {
      if (Date.now() - startedAt > LINK_GIVE_UP_MS) { setExpired(true); return; }
      startRef.current('qr');
    }, QR_REFRESH_MS);
    return () => clearInterval(t);
  }, [method, result, expired, startedAt]);

  const reset = () => { attempt.current += 1; setResult(null); setMethod(null); setExpired(false); setStartedAt(0); };

  if (!method) {
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-primary" onClick={() => { setMethod('qr'); start('qr'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={16} /> Link by scanning a QR code
        </button>
        <button type="button" className="btn-secondary" onClick={() => setMethod('code')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={16} /> Link with a code instead
        </button>
      </div>
    );
  }

  if (expired) {
    return (
      <div>
        <p style={{ margin: '0 0 12px', fontSize: '14px' }}>The code was not scanned in time.</p>
        <button type="button" className="btn-secondary" onClick={() => { reset(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Start again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <Steps method={method} />
        {method === 'code' && !result ? (
          <form onSubmit={e => { e.preventDefault(); start('code', phone); }} style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }} noValidate>
            <label htmlFor="wa-link-phone" style={{ fontSize: '13px', width: '100%' }}>The shop phone's WhatsApp number</label>
            <input id="wa-link-phone" className="input-field" inputMode="tel" placeholder="98480 22338"
              value={phone} onChange={e => setPhone(typedPhone(e.target.value))} style={{ flex: '1 1 180px', minWidth: 0 }} />
            <button type="submit" className="btn-primary" disabled={link.isPending || !phone.trim()}>
              {link.isPending ? 'Getting a code…' : 'Get the code'}
            </button>
          </form>
        ) : null}
        <button type="button" onClick={reset} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '13px' }}>
          Cancel
        </button>
      </div>
      <div style={{ flex: '0 0 auto' }}>
        {link.isPending && !result ? (
          <div style={{ width: 240, height: 240, display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" aria-label="Getting it ready" />
          </div>
        ) : result?.qr ? (
          <img src={result.qr} alt="QR code to scan with the shop's WhatsApp" width={240} height={240}
            style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'block' }} />
        ) : result?.pairingCode ? (
          <div aria-label="Code to type on the phone" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '4px', fontFamily: 'monospace', padding: '16px 20px', border: '1px dashed var(--border-light)', borderRadius: 8 }}>
            {result.pairingCode}
          </div>
        ) : null}
        {result ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 0' }}>Waiting for the phone…</p> : null}
      </div>
    </div>
  );
}

function DayBookCard({ dayBook }) {
  const save = useSaveDayBookWhatsApp();
  const sendNow = useSendDayBookNow();
  const [enabled, setEnabled] = useState(dayBook.enabled);
  const [time, setTime] = useState(dayBook.time || '22:00');
  const [to, setTo] = useState(dayBook.to || '');

  const dirty = enabled !== dayBook.enabled || time !== dayBook.time || (to || '') !== (dayBook.to || '');

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const saved = await save.mutateAsync({ enabled, time, to });
      setTo(saved.to || '');
      toast.success(saved.enabled ? `The Day Book will come on WhatsApp every day at ${saved.time}.` : 'The nightly Day Book is off.');
    } catch (err) {
      toast.error(err?.message || 'It could not be saved. Please try again.');
    }
  };

  const onSendNow = async () => {
    try {
      const r = await sendNow.mutateAsync({ nonce: crypto.randomUUID() });
      toast.success(`Today's Day Book so far is on its way to ${r.to}.`);
    } catch (err) {
      toast.error(err?.message || 'It could not be sent. Please try again.');
    }
  };

  return (
    <section style={card} aria-labelledby="wa-daybook-title">
      <h3 id="wa-daybook-title" style={{ margin: '0 0 4px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={18} /> The Day Book, every night
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        ScaleEzy sends you today's Day Book as a PDF on WhatsApp, from ScaleEzy's own number. Only you see this setting.
      </p>
      <form onSubmit={onSave} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          Send me the Day Book every night
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 1 160px' }}>
            <label htmlFor="wa-daybook-time" className="input-label">Time</label>
            <input id="wa-daybook-time" type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} step={60} />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label htmlFor="wa-daybook-to" className="input-label">Your WhatsApp number</label>
            <input id="wa-daybook-to" className="input-field" inputMode="tel" placeholder="98480 22338"
              value={to} onChange={e => setTo(typedPhone(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn-primary" disabled={save.isPending || !dirty}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-secondary" onClick={onSendNow} disabled={sendNow.isPending || !dayBook.to || dirty}
            title={!dayBook.to ? 'Save your number first' : dirty ? 'Save your changes first' : undefined}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {sendNow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send me today's now
          </button>
        </div>
      </form>
    </section>
  );
}

export default function WhatsAppSettings() {
  const { data, isLoading, isError, refetch } = useWhatsAppOverview();
  const disconnect = useDisconnectWhatsApp();
  const sendTest = useSendWhatsAppTest();
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [testTo, setTestTo] = useState('');

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" aria-label="Loading" /></div>;
  if (isError || !data) {
    return (
      <div style={card}>
        <p style={{ margin: '0 0 12px' }}>WhatsApp settings could not be loaded.</p>
        <button type="button" className="btn-secondary" onClick={() => refetch()}>Try again</button>
      </div>
    );
  }

  const status = data.account?.status;
  const linked = status === 'CONNECTED';

  const onTest = async (e) => {
    e.preventDefault();
    try {
      await sendTest.mutateAsync({ to: testTo, nonce: crypto.randomUUID() });
      toast.success('Test message on its way. Check that phone.');
    } catch (err) {
      toast.error(err?.message || 'The test could not be sent.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 760 }}>
      <section style={card} aria-labelledby="wa-link-title">
        <h3 id="wa-link-title" style={{ margin: '0 0 4px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={18} /> Your shop's WhatsApp
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Link the shop's own WhatsApp number once. Bills, purchase orders, goods receipts and return notes are then sent from it, straight to your customers and suppliers, when someone presses Send on WhatsApp. The phone keeps working as normal.
        </p>

        {!data.configured ? (
          <p style={{ margin: 0, fontSize: '14px' }}>WhatsApp sending is not set up for ScaleEzy yet. Share on WhatsApp still works on every document.</p>
        ) : data.problem ? (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: '14px' }}>{data.problem}</p>
            <button type="button" className="btn-secondary" onClick={() => refetch()}>Try again</button>
          </div>
        ) : !data.canManage ? (
          <p style={{ margin: 0, fontSize: '14px' }}>
            {linked ? `Linked: ${data.account.phone}.` : 'Not linked yet.'} Only the owner, or someone who manages the team, can change this.
          </p>
        ) : linked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px' }} role="status">
              <strong>Linked</strong>: {data.account.phone}
              {data.account.linkedAt ? ` · since ${new Date(data.account.linkedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </p>
            <form onSubmit={onTest} noValidate style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <label htmlFor="wa-test-to" className="input-label">Send a test message to</label>
                <input id="wa-test-to" className="input-field" inputMode="tel" placeholder="Your own number"
                  value={testTo} onChange={e => setTestTo(typedPhone(e.target.value))} />
              </div>
              <button type="submit" className="btn-secondary" disabled={sendTest.isPending || !testTo.trim()}>
                {sendTest.isPending ? 'Sending…' : 'Send test'}
              </button>
            </form>
            <div>
              <button type="button" className="btn-secondary" onClick={() => setConfirmUnlink(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger, #d9534f)' }}>
                <Unlink size={16} /> Unlink this number
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {status === 'DISCONNECTED' ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--accent-danger, #d9534f)' }} role="alert">
                The shop's WhatsApp was disconnected. Link it again to keep sending.
              </p>
            ) : null}
            <LinkPanel onLinked={() => refetch()} />
          </div>
        )}
      </section>

      {data.isOwner && data.dayBook ? <DayBookCard dayBook={data.dayBook} /> : null}

      <ConfirmModal
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        title="Unlink the shop's WhatsApp?"
        message="Bills and purchase orders will stop going from this number until it is linked again. The phone itself is not affected."
        confirmText="Unlink"
        confirmStyle="danger"
        onConfirm={async () => {
          try {
            await disconnect.mutateAsync();
            toast.success('Unlinked. Link a number again whenever you are ready.');
          } catch (err) {
            toast.error(err?.message || 'It could not be unlinked. Please try again.');
          }
        }}
      />
    </div>
  );
}
