import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, Users, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAudiencePreview, useSendCampaignTest } from '../../hooks/useCampaigns';
import { useAuth } from '../../context/AuthContext';
import { PLACEHOLDERS, MAX_TEXT, renderCampaign } from '../../utils/campaignText';
import MessageBubble from './MessageBubble';

/**
 * Write or change a draft campaign: its name, its words, and who it is for.
 *
 * The count under "Who gets it" is asked of the server as the choices change, so what the shop
 * sees is who it would really reach now -- only customers who agreed to offers, never anyone who
 * replied STOP. The preview on the right is the message as a customer reads it, STOP line included.
 */

const WHO = [
  { id: 'ALL', label: 'Everyone who agreed' },
  { id: 'RECENT', label: 'Bought recently' },
  { id: 'QUIET', label: "Haven't bought for a while" }
];

const numberOrUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

function audienceOf(f) {
  const a = {};
  const tags = f.tags.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length) a.tags = tags;
  if (f.who === 'RECENT' && f.days) a.boughtWithinDays = Number(f.days);
  if (f.who === 'QUIET' && f.days) a.notBoughtForDays = Number(f.days);
  if (numberOrUndefined(f.minSpend)) a.minSpend = Number(f.minSpend);
  if (numberOrUndefined(f.minPoints)) a.minPoints = Number(f.minPoints);
  return a;
}

function formOf(c) {
  const a = c?.audience ?? {};
  return {
    name: c?.name ?? '',
    text: c?.text ?? 'Hello {name}! ',
    who: a.boughtWithinDays ? 'RECENT' : a.notBoughtForDays ? 'QUIET' : 'ALL',
    days: String(a.boughtWithinDays ?? a.notBoughtForDays ?? ''),
    tags: (a.tags ?? []).join(', '),
    minSpend: a.minSpend ? String(a.minSpend) : '',
    minPoints: a.minPoints ? String(a.minPoints) : ''
  };
}

export default function CampaignEditor({ campaign, shopName, onClose, onSave, saving }) {
  const { user } = useAuth();
  const [f, setF] = useState(() => formOf(campaign));
  const textRef = useRef(null);
  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
  const audience = useMemo(() => audienceOf(f), [f]);

  // Asked a moment after typing stops, not on every key.
  const [asked, setAsked] = useState(audience);
  useEffect(() => { const t = setTimeout(() => setAsked(audience), 400); return () => clearTimeout(t); }, [audience]);
  const preview = useAudiencePreview(asked);
  const test = useSendCampaignTest();

  const daysNeeded = f.who !== 'ALL';
  const daysBad = daysNeeded && !(Number(f.days) >= 1 && Number.isInteger(Number(f.days)));
  const tooLong = f.text.length > MAX_TEXT;
  const canSave = f.name.trim() && f.text.trim() && !tooLong && !daysBad && !saving;

  // Where the cursor goes once an inserted word is on screen. Set after React has written the new
  // text: placing it before that, the new value landed and the cursor jumped away from the word.
  const caret = useRef(null);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && caret.current !== null) {
      el.focus();
      el.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [f.text]);
  const insert = (token) => {
    const el = textRef.current;
    const at = el ? el.selectionStart : f.text.length;
    const end = el ? el.selectionEnd : at;
    caret.current = at + token.length;
    setF(prev => ({ ...prev, text: prev.text.slice(0, at) + token + prev.text.slice(end) }));
  };

  // The preview is filled in for a real customer this reaches, with their own points (their value
  // at ₹1 a point is only a guide; the message itself uses the shop's own rate).
  const sample = preview.data?.sample?.[0]?.name ?? user?.name ?? 'Lakshmi';
  const samplePoints = preview.data?.sample?.[0]?.loyaltyPoints ?? 250;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="campaign-editor-title"
        style={{ width: '960px', maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="campaign-editor-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{campaign?.id ? 'Change campaign' : 'New campaign'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form style={{ padding: '20px 24px', overflowY: 'auto' }} onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({ name: f.name.trim(), text: f.text.trim(), audience });
        }}>
          <div className="mobile-col" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="c-name" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Name (only you see this)</label>
                <input id="c-name" className="input-field" value={f.name} onChange={set('name')} maxLength={80}
                  placeholder="Diwali sale 2026" style={{ width: '100%' }} autoFocus />
              </div>

              <div>
                <label htmlFor="c-text" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Message</label>
                <textarea id="c-text" ref={textRef} className="input-field" value={f.text} onChange={set('text')} rows={6}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} aria-invalid={tooLong}
                  aria-describedby="c-text-help" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add:</span>
                  {PLACEHOLDERS.map(p => (
                    // mousedown kept from taking focus, so the message keeps its cursor for the insert.
                    <button key={p.token} type="button" className="btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(p.token)}
                      style={{ padding: '3px 10px', fontSize: '12px' }}>{p.label}</button>
                  ))}
                  <span id="c-text-help" style={{ marginLeft: 'auto', fontSize: '12px', color: tooLong ? 'var(--danger, #dc2626)' : 'var(--text-secondary)' }}>
                    {f.text.length} / {MAX_TEXT}
                  </span>
                </div>
              </div>

              <fieldset style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 16px', margin: 0 }}>
                <legend style={{ fontSize: '13px', fontWeight: 600, padding: '0 6px' }}>Who gets it</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }} role="radiogroup" aria-label="Who gets it">
                  {WHO.map(w => (
                    <button key={w.id} type="button" role="radio" aria-checked={f.who === w.id}
                      className={f.who === w.id ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '13px' }}
                      onClick={() => setF(prev => ({ ...prev, who: w.id, days: w.id === 'ALL' ? '' : (prev.days || (w.id === 'RECENT' ? '30' : '90')) }))}>
                      {w.label}
                    </button>
                  ))}
                </div>
                {daysNeeded && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <label htmlFor="c-days" style={{ fontSize: '13px' }}>{f.who === 'RECENT' ? 'Bought in the last' : 'Nothing bought for'}</label>
                    <input id="c-days" className="input-field" type="number" min="1" max="3650" inputMode="numeric" value={f.days} onChange={set('days')}
                      style={{ width: '90px' }} aria-invalid={daysBad} />
                    <span style={{ fontSize: '13px' }}>days</span>
                  </div>
                )}
                <div className="mobile-col" style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 2 }}>
                    <label htmlFor="c-tags" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Only these groups (optional)</label>
                    <input id="c-tags" className="input-field" value={f.tags} onChange={set('tags')} placeholder="VIP, Wholesale" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="c-spend" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Spent at least ₹</label>
                    <input id="c-spend" className="input-field" type="number" min="0" inputMode="decimal" value={f.minSpend} onChange={set('minSpend')} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="c-points" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Points at least</label>
                    <input id="c-points" className="input-field" type="number" min="1" inputMode="numeric" value={f.minPoints} onChange={set('minPoints')} style={{ width: '100%' }} />
                  </div>
                </div>
                <div aria-live="polite" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <Users size={16} />
                  {preview.isFetching && !preview.data ? <Loader2 size={14} className="animate-spin" />
                    : preview.error ? <span style={{ color: 'var(--danger, #dc2626)' }}>{preview.error.message}</span>
                    : preview.data ? (
                      <span>
                        Reaches <strong>{preview.data.count.toLocaleString('en-IN')}</strong> customer{preview.data.count === 1 ? '' : 's'}
                        {preview.data.sample?.length ? <span style={{ color: 'var(--text-secondary)' }}> ({preview.data.sample.map(s => s.name).join(', ')}{preview.data.count > preview.data.sample.length ? '…' : ''})</span> : null}
                      </span>
                    ) : null}
                </div>
                {preview.data && preview.data.agreedToOffers < preview.data.customersWithPhone && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {preview.data.agreedToOffers.toLocaleString('en-IN')} of your {preview.data.customersWithPhone.toLocaleString('en-IN')} customers with a phone number have agreed to offers on WhatsApp. Only they can be sent a campaign.
                  </p>
                )}
              </fieldset>
            </div>

            <div style={{ width: '320px', maxWidth: '100%', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>What {sample.split(' ')[0]} will see</div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '12px', padding: '16px' }}>
                <MessageBubble text={renderCampaign(f.text, { name: sample, shop: shopName, points: samplePoints, pointsValue: `₹${samplePoints.toLocaleString('en-IN')}` })} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 12px' }}>
                The last line is always added, so customers can stop these messages.
              </p>
              <button type="button" className="btn-secondary" disabled={!f.text.trim() || tooLong || test.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                onClick={async () => {
                  try {
                    const r = await test.mutateAsync({ text: f.text });
                    toast.success(`Test sent to your shop's WhatsApp (${r.to}).`);
                  } catch (e) { toast.error(e?.message || 'The test could not be sent.'); }
                }}>
                {test.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send me a test
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSave}>{saving ? 'Saving…' : 'Save draft'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
