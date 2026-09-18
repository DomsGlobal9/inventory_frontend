import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useDayBookSending, useSendDayBook, useDayBookMessage } from '../../hooks/useWhatsApp';

/**
 * "Send on WhatsApp" on the Day Book page: the day, or the range, that is on the screen.
 *
 * It goes from ScaleEzy's number to the WhatsApp number the owner saved for the Day Book, the
 * same one the nightly Day Book uses, never to a number typed here: these are the shop's profit
 * figures. The server builds the PDF, so what arrives is what Download gives.
 *
 * When WhatsApp is not set up for ScaleEzy, it is the old share link with the short summary.
 * One press is one send, and a shop can ask for ten a day (the nightly one apart).
 */

const STATUS = {
  QUEUED: { text: 'Waiting to send', icon: Clock, tone: 'var(--text-muted)' },
  SENDING: { text: 'Sending…', icon: Loader2, tone: 'var(--text-muted)', spin: true },
  SENT: { text: 'Sent', icon: Check, tone: 'var(--text-secondary)' },
  DELIVERED: { text: 'Delivered', icon: CheckCheck, tone: 'var(--text-secondary)' },
  READ: { text: 'Read', icon: CheckCheck, tone: '#1d9bf0' },
  FAILED: { text: 'Not sent', icon: AlertCircle, tone: 'var(--accent-danger, #d9534f)' },
  EXPIRED: { text: 'Not sent', icon: AlertCircle, tone: 'var(--accent-danger, #d9534f)' }
};

const GREEN = { color: '#25D366', borderColor: 'rgba(37,211,102,0.4)' };

export default function DayBookSendButton({ what, whatLabel, disabled, fallbackHref }) {
  const { data: sending } = useDayBookSending();
  const send = useSendDayBook();
  const busy = useRef(false);
  // The message of the last press, kept per day/range on show: another day starts clean.
  const [sent, setSent] = useState({ for: null, id: null });
  const whatKey = JSON.stringify(what);
  const messageId = sent.for === whatKey ? sent.id : null;
  const { data: message } = useDayBookMessage(messageId);

  if (!sending) return null;

  if (!sending.configured) {
    if (!fallbackHref) return null;
    return (
      <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', fontSize: '13px', ...GREEN }}
        title="Open WhatsApp with this summary ready to send">
        <WhatsAppIcon size={15} /> Share
      </a>
    );
  }

  const left = Math.max(0, (sending.limit || 0) - (sending.sentToday || 0));

  const press = async () => {
    if (busy.current) return;
    if (!sending.to) {
      toast.error(sending.isOwner
        ? 'Save the WhatsApp number the Day Book should go to first, in Settings > WhatsApp.'
        : 'The shop owner has not saved a WhatsApp number for the Day Book yet. They can do it in Settings > WhatsApp.');
      return;
    }
    busy.current = true;
    try {
      const out = await send.mutateAsync({ what, nonce: crypto.randomUUID() });
      setSent({ for: whatKey, id: out?.id || null });
      toast.success(`The Day Book for ${whatLabel} is on its way to ${out?.to || sending.to} on WhatsApp.`);
    } catch (err) {
      toast.error(err?.message || 'It could not be sent. Please try again.');
    } finally {
      busy.current = false;
    }
  };

  const state = message ? STATUS[message.status] : null;
  const Icon = state?.icon;
  const working = send.isPending;
  const title = !sending.to
    ? 'No WhatsApp number is saved for the Day Book yet'
    : left === 0
      ? `This shop has had ${sending.limit} Day Books sent today, which is the limit`
      : `Sends this Day Book as a PDF to ${sending.to}, from ScaleEzy's number. ${left} of ${sending.limit} left today`;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <button type="button" className="btn-secondary" onClick={press} disabled={disabled || working || left === 0} title={title}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', ...GREEN,
          opacity: (disabled || working || left === 0) ? 0.55 : 1,
          cursor: (disabled || working || left === 0) ? 'not-allowed' : 'pointer'
        }}>
        {working ? <Loader2 size={15} className="animate-spin" /> : <WhatsAppIcon size={15} />}
        {working ? 'Sending…' : 'Send on WhatsApp'}
      </button>
      {state ? (
        <span role="status" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: state.tone }}>
          <Icon size={12} className={state.spin ? 'animate-spin' : undefined} />
          {state.text}{message.to ? ` to ${message.to}` : ''}
          {message.failReason ? ` — ${message.failReason}` : ''}
        </span>
      ) : null}
      {message?.status === 'QUEUED' && message.waitingReason ? (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: 320 }}>{message.waitingReason}</span>
      ) : null}
      {!sending.to && sending.isOwner ? (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          <Link to="/settings?section=WHATSAPP">Save your WhatsApp number</Link> to get it there.
        </span>
      ) : null}
    </span>
  );
}
