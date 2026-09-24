import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Select from '../common/Select';

/**
 * Where a campaign's {link} goes: nowhere, a chat with the shop on WhatsApp, or a web page.
 * Each customer gets their own short link (go.scaleezy.com/...), so the campaign can say who tapped.
 *
 * `value` is null or { type: 'WHATSAPP', phone, chatText, days } / { type: 'EXTERNAL', url, days }.
 * The server checks the address; this only gathers it.
 */
const DAYS = [30, 90, 180, 365];

export default function LinkChooser({ value, onChange, shopPhone, campaignName, disabled }) {
  const type = value?.type ?? 'NONE';
  const set = (patch) => onChange({ ...(value ?? {}), ...patch });
  const choose = (t) => {
    if (t === 'NONE') return onChange(null);
    if (t === 'WHATSAPP') return onChange({ type: 'WHATSAPP', phone: value?.phone ?? shopPhone ?? '', chatText: value?.chatText ?? '', days: value?.days ?? 90 });
    return onChange({ type: 'EXTERNAL', url: value?.url ?? '', days: value?.days ?? 90 });
  };

  return (
    <fieldset style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 16px', margin: 0 }} disabled={disabled}>
      <legend style={{ fontSize: '13px', fontWeight: 600, padding: '0 6px' }}>Link (optional)</legend>
      <div role="radiogroup" aria-label="Where the link goes" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: type === 'NONE' ? 0 : '12px' }}>
        {[['NONE', 'No link'], ['WHATSAPP', 'Chat with the shop'], ['EXTERNAL', 'A web page']].map(([t, label]) => (
          <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => choose(t)}>{label}</button>
        ))}
      </div>

      {type === 'WHATSAPP' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div>
            <label htmlFor="l-phone" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>The shop's WhatsApp number customers chat with</label>
            <input id="l-phone" className="input-field" type="tel" inputMode="tel" value={value.phone ?? ''} onChange={(e) => set({ phone: e.target.value })}
              placeholder={shopPhone ?? '98480 22338'} maxLength={20} style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="l-chat" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>First line, typed for the customer (they can change it)</label>
            <input id="l-chat" className="input-field" value={value.chatText ?? ''} onChange={(e) => set({ chatText: e.target.value })}
              placeholder={`Hi, I saw your offer: ${campaignName || 'this offer'}`} maxLength={200} style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {type === 'EXTERNAL' && (
        <div style={{ display: 'grid', gap: '8px' }}>
          <div>
            <label htmlFor="l-url" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Web address (starting https://)</label>
            <input id="l-url" className="input-field" type="url" inputMode="url" value={value.url ?? ''} onChange={(e) => set({ url: e.target.value })}
              placeholder="https://yourshop.in/products/red-silk-saree" maxLength={2000} style={{ width: '100%' }} />
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgb(161,98,7)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            Customers will leave your shop's pages for this address. Use only your own website or one you trust.
          </p>
        </div>
      )}

      {type !== 'NONE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <label htmlFor="l-days" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>The link works for</label>
          <Select id="l-days" className="input-field" value={value.days ?? 90} onChange={(e) => set({ days: Number(e.target.value) })} style={{ width: 'auto' }}>
            {DAYS.map(d => <option key={d} value={d}>{d} days</option>)}
          </Select>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>After that it says the offer has ended.</span>
        </div>
      )}
    </fieldset>
  );
}
