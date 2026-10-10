import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Editing what a product IS: its description, how it is described, and what it costs.
 *
 * In place on the overview rather than behind a separate screen, because everything here is
 * already on that panel and a shopkeeper correcting a typo in a description should not have to
 * find their way somewhere else and back.
 *
 * THE PRICE IS THE PART THAT NEEDS CARE. basePrice is only a fallback: what a customer pays comes
 * from the variant's own price. So changing the base alone changes nothing at the till on most
 * products. The server carries the variants that were FOLLOWING the base along with it, and leaves
 * the ones somebody priced on purpose alone -- and this screen says which, in words, BEFORE the
 * save, because "1 of 2 variants will change" is a sentence a shopkeeper can disagree with while
 * there is still time.
 */

const CATEGORIES = ['WOMEN', 'MEN', 'KIDS', 'UNISEX'];
const TYPES = ['READY_TO_WEAR', 'UNSTITCHED', 'ACCESSORY'];

/** Rates a saree shop actually meets. Free text would invite 5 to be typed for 5%, meaning 0.05%. */
const RATES = [
  { label: 'Not set', value: '' },
  { label: 'Exempt (0%)', value: '0' },
  { label: '5%', value: '500' },
  { label: '12%', value: '1200' },
  { label: '18%', value: '1800' },
  { label: '28%', value: '2800' }
];

export default function ProductOverviewEditor({ product, saving, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: product.title ?? '',
    description: product.description ?? '',
    brand: product.brand ?? '',
    category: product.category ?? '',
    productType: product.productType ?? '',
    dressType: product.dressType ?? '',
    fabric: product.fabric ?? '',
    craft: product.craft ?? '',
    hsnCode: product.hsnCode ?? '',
    taxRateBps: product.taxRateBps == null ? '' : String(product.taxRateBps),
    taxSlabbed: Boolean(product.taxSlabbed),
    isService: Boolean(product.isService),
    basePrice: product.basePrice == null ? '' : String(product.basePrice)
  });
  const [impact, setImpact] = useState(null);
  const [nameProblem, setNameProblem] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const priceChanged = String(form.basePrice) !== String(product.basePrice ?? '');

  /*
   * What the new price would carry with it, asked while they are still typing.
   *
   * Debounced, because it fires on every keystroke otherwise and the answer for "2", "24" and
   * "245" on the way to "24500" is noise nobody asked for.
   */
  useEffect(() => {
    if (!priceChanged || form.basePrice === '') { setImpact(null); return; }
    const price = Number(form.basePrice);
    if (!Number.isFinite(price) || price < 0) { setImpact(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        // The api client's interceptor already unwraps to the body, so res IS { success, data }.
        const res = await api.get(`/products/${product.id}/price-impact`, { params: { basePrice: price } });
        if (alive) setImpact(res?.data ?? null);
      } catch { if (alive) setImpact(null); }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [form.basePrice, priceChanged, product.id]);

  const submit = (e) => {
    e.preventDefault();
    // Said here, next to the box, rather than as a toast from the server after the round trip.
    const title = form.title.replace(/\s+/g, ' ').trim();
    if (!title) { setNameProblem('Give the product a name.'); return; }
    const out = {
      title,
      description: form.description.trim(),
      brand: form.brand.trim(),
      category: form.category,
      productType: form.productType,
      dressType: form.dressType.trim(),
      fabric: form.fabric.trim(),
      craft: form.craft.trim(),
      // An emptied box means "not set". The server turns '' into null for exactly this reason.
      hsnCode: form.hsnCode.trim(),
      taxSlabbed: form.taxSlabbed,
      isService: form.isService
    };
    if (form.taxRateBps !== '') out.taxRateBps = Number(form.taxRateBps);
    if (form.basePrice !== '') out.basePrice = Number(form.basePrice);
    onSave(out);
  };

  const field = (label, key, extra = {}) => (
    <div>
      <label className="input-label">{label}</label>
      <input className="input-field" aria-label={label} value={form[key]} onChange={set(key)} {...extra} />
    </div>
  );

  return (
    <form onSubmit={submit}>
      {/* The name first: it is what a customer, the shop and every list see. Renaming changes the
          product's web address too (the server rebuilds it), but the product code stays, so old
          shop links keep working. */}
      <div style={{ marginBottom: '20px' }}>
        <label className="input-label" htmlFor="product-name">Product name</label>
        <input id="product-name" className="input-field" value={form.title} maxLength={200}
          onChange={(e) => { setNameProblem(null); set('title')(e); }}
          aria-invalid={nameProblem ? true : undefined} aria-describedby={nameProblem ? 'product-name-problem' : undefined} />
        {nameProblem ? <p id="product-name-problem" role="alert" style={{ color: 'var(--accent-danger)', fontSize: '12.5px', margin: '6px 0 0' }}>{nameProblem}</p> : null}
      </div>

      <div>
        <label className="input-label">Description</label>
        <textarea className="input-field" rows={4} value={form.description} onChange={set('description')}
          placeholder="How you would describe this piece to a customer." style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {field('Brand', 'brand')}
        <div>
          <label className="input-label">Category</label>
          <select className="input-field" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Type</label>
          <select className="input-field" value={form.productType} onChange={set('productType')}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {field('Dress style', 'dressType')}
        {field('Fabric', 'fabric')}
        {field('Craft / work', 'craft')}
      </div>

      <h4 style={{ margin: '28px 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Tax</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {field('HSN code', 'hsnCode', { placeholder: '4, 6 or 8 digits', inputMode: 'numeric' })}
        <div>
          <label className="input-label">GST rate</label>
          <select className="input-field" aria-label="GST rate" value={form.taxRateBps} onChange={set('taxRateBps')}>
            {RATES.map((r) => <option key={r.label} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Priced by the piece</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.taxSlabbed}
              onChange={(e) => setForm((f) => ({ ...f, taxSlabbed: e.target.checked }))} />
            5% up to ₹2,500, 18% above
          </label>
        </div>
        <div>
          <label className="input-label">Service</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.isService}
              onChange={(e) => setForm((f) => ({ ...f, isService: e.target.checked }))} />
            This is a service (no stock)
          </label>
        </div>
      </div>

      <h4 style={{ margin: '28px 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Price</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {field('Global price (₹)', 'basePrice', { inputMode: 'decimal' })}
      </div>

      {/*
        Said before saving, not reported after. A shopkeeper who does not want the variants to
        move can still change their mind at this point, which is the only point where it helps.
      */}
      {priceChanged && impact && (
        <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {impact.follow === 0
            ? `No variant is priced at the old ₹${Number(product.basePrice).toLocaleString('en-IN')}, so none will change. Set a variant's own price on the Variants tab.`
            : `${impact.follow} variant${impact.follow === 1 ? '' : 's'} priced at the old ₹${Number(product.basePrice).toLocaleString('en-IN')} will change to the new price.`}
          {impact.keepTheirOwn > 0 &&
            ` ${impact.keepTheirOwn} priced differently will keep ${impact.keepTheirOwn === 1 ? 'its' : 'their'} own.`}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
