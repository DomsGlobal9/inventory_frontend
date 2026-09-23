import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { usePermission } from '../../hooks/usePermission';
import { useWhatsAppOverview, useWhatsAppMessage, useSendWhatsAppDocument } from '../../hooks/useWhatsApp';

/**
 * "Send on WhatsApp" for one document: a purchase order, a goods receipt, a bill, a return note.
 *
 * When the shop's own WhatsApp is linked, pressing it sends the PDF straight to the supplier or
 * customer on file -- the same PDF Download makes -- and then shows where it has got to:
 * waiting, sent, delivered, read, or why it was not sent. The server decides who receives it.
 *
 * When it is not linked (or WhatsApp is not set up for ScaleEzy yet), it is the old Share on
 * WhatsApp link, which opens WhatsApp on this device with the message typed, and a line telling
 * whoever may link the shop's number that the PDF could go straight to them.
 *
 * One press is one send: the button is busy until the send is handed over, and each press
 * carries its own id, so a retried request is recognised by the server rather than sent twice.
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

/**
 * What else on screen changes once WhatsApp has a document. A purchase order counts as sent the
 * moment WhatsApp has it (the server does that), so its page must read SENT without a reload.
 */
const REFRESH_WHEN_SENT = { PURCHASE_ORDER: [['purchase-orders']] };
const HANDED_OVER = ['SENT', 'DELIVERED', 'READ'];

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('The PDF could not be read. Please try again.'));
  reader.readAsDataURL(blob);
});

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export default function WhatsAppSendButton({ kind, id, buildPdf, fileName, fallbackHref, permission, recipientLabel, style }) {
  const { can } = usePermission();
  // Only asked about by someone who may send this document: for anyone else the server refuses.
  const allowed = !permission || can(permission);
  const { data: overview } = useWhatsAppOverview({ enabled: allowed });
  const { data: latest } = useWhatsAppMessage(kind, id, { enabled: allowed });
  const send = useSendWhatsAppDocument(kind, id);
  const [preparing, setPreparing] = useState(false);
  const busy = useRef(false);
  const qc = useQueryClient();
  const wasHandedOver = useRef(null);

  // Once, when this document's message first reaches WhatsApp.
  useEffect(() => {
    const now = HANDED_OVER.includes(latest?.status);
    if (wasHandedOver.current === false && now) {
      (REFRESH_WHEN_SENT[kind] || []).forEach(queryKey => qc.invalidateQueries({ queryKey }));
    }
    if (latest !== undefined) wasHandedOver.current = now;
  }, [latest?.status, kind, qc]);

  if (!allowed) return null;

  const linked = overview?.configured && overview?.account?.status === 'CONNECTED';

  /**
   * The customer replied STOP. ScaleEzy will not send them anything from the shop's number, bills
   * included -- so offering "Send on WhatsApp" here would be offering a button whose only possible
   * outcome is a refusal. Offer the way round it instead: share it from the shopkeeper's own phone,
   * which is a message from a person rather than sending from the shop's system.
   */
  if (latest?.recipientStopped) {
    const who = latest.recipientName || recipientLabel || 'This customer';
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', ...style }}>
        {fallbackHref ? (
          <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <WhatsAppIcon size={16} /> Share on WhatsApp
          </a>
        ) : null}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: 320 }}>
          {who} replied STOP, so ScaleEzy cannot send it{fallbackHref ? '. Share it from your own phone, or print it.' : '. Print it instead.'}
        </span>
      </span>
    );
  }

  if (!linked) {
    if (!fallbackHref) return null;
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', ...style }}>
        <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
          <WhatsAppIcon size={16} /> Share on WhatsApp
        </a>
        {overview?.canManage && overview?.configured ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            <Link to="/settings?section=WHATSAPP">Link your shop's WhatsApp</Link> to send the PDF straight to them.
          </span>
        ) : null}
      </span>
    );
  }

  const press = async () => {
    if (busy.current) return;
    busy.current = true;
    setPreparing(true);
    try {
      const blob = await buildPdf();
      if (!blob) throw new Error('The PDF could not be made. Please try again.');
      const pdfBase64 = await blobToBase64(blob);
      const sent = await send.mutateAsync({ pdfBase64, fileName, nonce: crypto.randomUUID() });
      toast.success(`Sending to ${sent?.recipientName || recipientLabel || 'them'} on WhatsApp.`);
    } catch (err) {
      toast.error(err?.message || 'It could not be sent. Please try again.');
    } finally {
      busy.current = false;
      setPreparing(false);
    }
  };

  const state = latest ? STATUS[latest.status] : null;
  const Icon = state?.icon;
  const working = preparing || send.isPending;
  const again = latest && ['SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED'].includes(latest.status);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', ...style }}>
      <button type="button" className="btn-secondary" onClick={press} disabled={working}
        title={recipientLabel ? `Sends the PDF to ${recipientLabel}, at the number saved for them` : undefined}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {working ? <Loader2 size={16} className="animate-spin" /> : <WhatsAppIcon size={16} />}
        {working ? 'Sending…' : again ? 'Send on WhatsApp again' : 'Send on WhatsApp'}
      </button>
      {state ? (
        <span role="status" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: state.tone }}>
          <Icon size={12} className={state.spin ? 'animate-spin' : undefined} />
          {state.text}
          {latest.to ? ` to ${latest.to}` : ''}
          {latest.updatedAt ? ` · ${when(latest.updatedAt)}` : ''}
          {latest.failReason ? ` — ${latest.failReason}` : ''}
        </span>
      ) : null}
      {latest?.status === 'QUEUED' && latest.waitingReason ? (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: 320 }}>{latest.waitingReason}</span>
      ) : null}
    </span>
  );
}
