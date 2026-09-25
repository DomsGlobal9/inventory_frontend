import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Loader2, BookmarkPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAudiencePreview, useCampaignOverview, useSaveTemplate } from '../../hooks/useCampaigns';
import { useAuth } from '../../context/AuthContext';
import { PLACEHOLDERS, LINK_PLACEHOLDER, MAX_TEXT, MAX_CAPTION, renderCampaign, longestCaption } from '../../utils/campaignText';
import MessageBubble from './MessageBubble';
import TestSend from './TestSend';
import PicturePicker from './PicturePicker';
import LinkChooser from './LinkChooser';

/**
 * Write or change a draft campaign: its name, picture, words, link, who it is for, and when.
 *
 * The count under "Who gets it" is asked of the server as the choices change, so what the shop sees
 * is who it would really reach now -- and, before anything is sent, who is left out and why. The
 * preview on the right is the message as a customer's phone shows it: picture on top, their own
 * link in the words, the STOP line at the end.
 *
 * `campaign` is a saved draft, or a template's words/picture/link to start from, or nothing.
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

/** The link as the server keeps it, turned back into the chooser's fields. */
const linkForm = (l) => (!l ? null
  : l.type === 'WHATSAPP' ? { type: 'WHATSAPP', phone: l.phone ?? '', chatText: l.chatText ?? '', days: l.days ?? 90 }
  : { type: 'EXTERNAL', url: l.target ?? l.url ?? '', days: l.days ?? 90 });

/** And the chooser's fields as the server wants them. */
const linkBody = (l) => (!l ? null
  : l.type === 'WHATSAPP' ? { type: 'WHATSAPP', phone: l.phone?.trim() || undefined, chatText: l.chatText?.trim() || undefined, days: l.days }
  : { type: 'EXTERNAL', url: (l.url ?? '').trim(), days: l.days });

// A date-time box shows local time; the server wants an instant.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function formOf(c) {
  const a = c?.audience ?? {};
  return {
    name: c?.name ?? '',
    text: c?.text ?? 'Hello {name}! ',
    who: a.boughtWithinDays ? 'RECENT' : a.notBoughtForDays ? 'QUIET' : 'ALL',
    days: String(a.boughtWithinDays ?? a.notBoughtForDays ?? ''),
    tags: (a.tags ?? []).join(', '),
    minSpend: a.minSpend ? String(a.minSpend) : '',
    minPoints: a.minPoints ? String(a.minPoints) : '',
    media: c?.media ?? null,
    link: linkForm(c?.link),
    later: !!c?.startAt,
    startAt: toLocalInput(c?.startAt)
  };
}

export default function CampaignEditor({ campaign, shopName, onClose, onSave, saving }) {
  const { user } = useAuth();
  const overview = useCampaignOverview();
  const features = overview.data?.features ?? {};
  const saveTemplate = useSaveTemplate();
  const [f, setF] = useState(() => formOf(campaign));
  const textRef = useRef(null);
  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
  const audience = useMemo(() => audienceOf(f), [f]);

  // Asked a moment after typing stops, not on every key.
  const [asked, setAsked] = useState(audience);
  useEffect(() => { const t = setTimeout(() => setAsked(audience), 400); return () => clearTimeout(t); }, [audience]);
  const preview = useAudiencePreview(asked);
  const bd = preview.data?.breakdown;

  const daysNeeded = f.who !== 'ALL';
  const daysBad = daysNeeded && !(Number(f.days) >= 1 && Number.isInteger(Number(f.days)));
  const tooLong = f.text.length > MAX_TEXT;
  // Under a picture WhatsApp allows 1,024 letters, counted with the longest a name, points and the link can be.
  const captionLength = f.media ? longestCaption(f.text, shopName) : null;
  const captionTooLong = captionLength !== null && captionLength > MAX_CAPTION;
  const hasLinkWord = /\{link\}/.test(f.text);
  const linkMismatch = !!f.link !== hasLinkWord;
  // A real price: a rupee sign before a number, or a number followed by "rs"/"rupees". Deliberately
  // not every number -- "20% off", "10 am" and "2 for 1" are not prices, and a note that cries wolf
  // on every message is a note nobody reads. {points_value} is our own word, already a live figure.
  const hasPrice = /(?:₹|\bRs\.?\s?)\s?\d|\d\s?(?:rupees|rs\b)/i.test(f.text.replace(/\{points_value\}/g, ''));
  const laterBad = f.later && !(f.startAt && new Date(f.startAt).getTime() > Date.now());
  const canSave = f.name.trim() && f.text.trim() && !tooLong && !captionTooLong && !daysBad && !linkMismatch && !laterBad && !saving;

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
  const setLink = (link) => setF(prev => {
    // Choosing a link puts {link} at the end if it is not there yet; "No link" takes it out.
    let text = prev.text;
    if (link && !/\{link\}/.test(text)) text = `${text.trimEnd()}\n👉 {link}`;
    if (!link) text = text.replace(/\n?👉 \{link\}/g, '').replace(/\{link\}/g, '').trimEnd();
    return { ...prev, link, text };
  });

  // The preview is filled in for a real customer this reaches, with their own points (their value
  // at ₹1 a point is only a guide; the message itself uses the shop's own rate).
  const sample = preview.data?.sample?.[0]?.name ?? user?.name ?? 'Lakshmi';
  const samplePoints = preview.data?.sample?.[0]?.loyaltyPoints ?? 250;
  const body = () => ({
    name: f.name.trim(), text: f.text.trim(), audience,
    mediaId: f.media?.id ?? null,
    link: linkBody(f.link),
    startAt: f.later && f.startAt ? new Date(f.startAt).toISOString() : null
  });

  const counter = captionLength !== null
    ? { text: `${captionLength.toLocaleString('en-IN')} / ${MAX_CAPTION.toLocaleString('en-IN')} with the picture`, bad: captionTooLong }
    : { text: `${f.text.length} / ${MAX_TEXT}`, bad: tooLong };

  return (
    createPortal(<div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="campaign-editor-title"
        style={{ width: '1000px', maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="campaign-editor-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{campaign?.id ? 'Change campaign' : 'New campaign'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form style={{ padding: '20px 24px', overflowY: 'auto' }} onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave(body());
        }}>
          <div className="mobile-col" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="c-name" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Name (only you see this)</label>
                <input id="c-name" className="input-field" value={f.name} onChange={set('name')} maxLength={80}
                  placeholder="Diwali sale 2026" style={{ width: '100%' }} autoFocus />
              </div>

              {features.picture
                ? <PicturePicker value={f.media} onChange={(media) => setF(prev => ({ ...prev, media }))} disabled={saving} />
                : overview.data && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Pictures in campaigns are not switched on for ScaleEzy yet.</p>}

              <div>
                <label htmlFor="c-text" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Message</label>
                <textarea id="c-text" ref={textRef} className="input-field" value={f.text} onChange={set('text')} rows={6}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} aria-invalid={counter.bad || linkMismatch}
                  aria-describedby="c-text-help" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add:</span>
                  {[...PLACEHOLDERS, ...(f.link ? [LINK_PLACEHOLDER] : [])].map(p => (
                    // mousedown kept from taking focus, so the message keeps its cursor for the insert.
                    <button key={p.token} type="button" className="btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(p.token)}
                      disabled={p.token === '{link}' && hasLinkWord}
                      style={{ padding: '3px 10px', fontSize: '12px' }}>{p.label}</button>
                  ))}
                  <span id="c-text-help" style={{ marginLeft: 'auto', fontSize: '12px', color: counter.bad ? 'var(--danger, #dc2626)' : 'var(--text-secondary)' }}>
                    {counter.text}
                  </span>
                </div>
                {captionTooLong && <p role="alert" style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--danger, #dc2626)' }}>
                  With a picture WhatsApp allows {MAX_CAPTION.toLocaleString('en-IN')} letters under it, counting a long name, the link and the STOP line. Shorten the words by {(captionLength - MAX_CAPTION).toLocaleString('en-IN')}.
                </p>}
                {linkMismatch && <p role="alert" style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--danger, #dc2626)' }}>
                  {f.link ? 'Put {link} in the message where the link should go — the "Link" button adds it.' : 'Choose where the link goes below, or take {link} out of the message.'}
                </p>}
                {/* A price typed into the words is frozen the moment the campaign starts, while the
                    link keeps showing today's price. Worth saying once, quietly: a sale that ends
                    on Sunday and a message that still promises the sale price is a real argument at
                    the counter. Not an error -- plenty of shops mean to name the price. */}
                {hasPrice && <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Prices in the message are fixed when you send; the link shows today's price.
                </p>}
              </div>

              {features.link
                ? <LinkChooser value={f.link} onChange={setLink} shopPhone={features.shopPhone} campaignName={f.name} disabled={saving} />
                : overview.data && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Links in campaigns are not switched on for ScaleEzy yet.</p>}

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
                {bd && bd.matched > bd.reachable + 0 && <LeftOut bd={bd} />}
                {bd && bd.recentOffer > 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {bd.recentOffer.toLocaleString('en-IN')} had an offer from you in the last 3 days. Each is skipped if their turn comes within those 3 days, so nobody gets two offers so close together.
                  </p>
                )}
              </fieldset>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.later} onChange={(e) => setF(prev => ({ ...prev, later: e.target.checked }))} />
                  Send later, not as soon as it is started
                </label>
                {f.later && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <label htmlFor="c-start" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Not before</label>
                    <input id="c-start" className="input-field" type="datetime-local" value={f.startAt} onChange={set('startAt')} aria-invalid={laterBad} style={{ width: 'auto' }} />
                    <span style={{ fontSize: '12px', color: laterBad ? 'var(--danger, #dc2626)' : 'var(--text-secondary)' }}>
                      {laterBad ? 'Choose a time in the future.' : 'Messages go only between 10 am and 8 pm.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ width: '320px', maxWidth: '100%', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>What {sample.split(' ')[0]} will see</div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '12px', padding: '16px' }}>
                <MessageBubble image={f.media?.url} text={renderCampaign(f.text, { name: sample, shop: shopName, points: samplePoints, pointsValue: `₹${samplePoints.toLocaleString('en-IN')}` })} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 12px' }}>
                The last line is always added, so customers can stop these messages.
                {f.link ? ' Each customer gets their own link, so you can see who tapped it.' : ''}
              </p>
              <TestSend draft={{ text: f.text, mediaId: f.media?.id ?? null, link: linkBody(f.link), name: f.name }}
                disabled={!f.text.trim() || tooLong || captionTooLong || linkMismatch} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" disabled={!canSave || saveTemplate.isPending}
              onClick={async () => {
                try {
                  await saveTemplate.mutateAsync({ name: f.name.trim(), text: f.text.trim(), mediaId: f.media?.id ?? null, link: linkBody(f.link) });
                  toast.success(`Saved as the template "${f.name.trim()}".`);
                } catch (e) { toast.error(e?.message || 'The template could not be saved.'); }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}><BookmarkPlus size={15} /> Save as template</button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSave}>{saving ? 'Saving…' : 'Save draft'}</button>
          </div>
        </form>
      </div>
    </div>, document.body)
  );
}

/** The dry run: of the customers these choices describe, who is left out, and why. */
export function LeftOut({ bd }) {
  const rows = [
    [bd.notAgreed, 'have not agreed to offers'],
    [bd.stopped, 'replied STOP'],
    [bd.noPhone, 'have no phone number']
  ].filter(([n]) => n > 0);
  if (!rows.length) return null;
  return (
    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
      Of the {bd.matched.toLocaleString('en-IN')} customers these choices describe, left out: {rows.map(([n, why]) => `${n.toLocaleString('en-IN')} ${why}`).join(', ')}.
    </p>
  );
}
