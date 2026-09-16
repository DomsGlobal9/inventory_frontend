import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Minus, Plus, Trash2, Tag, Percent, CheckCircle2, Printer, Loader2, UserRound, X, ShoppingBag, MonitorSmartphone } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useCustomerDetails } from '../../hooks/useCustomers';
import { useCustomerByPhone, usePricingQuote, useCompleteSale, COUNTER_PHONE_QUERY } from '../../hooks/useCounterSale';
import { normalisePhone, formatPhone } from '../../utils/phone';
import { formatINRExact } from '../../utils/formatUtils';
import ItemSearch from '../../components/sales/counter/ItemSearch';
import PaymentPanel, { buildPayments, paise, EMPTY_PAYMENT } from '../../components/sales/counter/PaymentPanel';

const rupees = (p) => formatINRExact(p / 100);

const REASON_MIN = 4;
const storageKeyFor = (locationId) => `scaleezy:new-sale:${locationId}`;

const newSale = (customerId = null) => ({
  // One id per basket. Pressing Complete twice, or again after a dropped connection, is the same sale.
  saleId: crypto.randomUUID(),
  phone: '', name: '', email: '',
  linkedCustomerId: customerId,
  items: [], codes: [], billManual: null,
  payment: EMPTY_PAYMENT
});

function readSaved(locationId) {
  try {
    const raw = localStorage.getItem(storageKeyFor(locationId));
    const saved = raw ? JSON.parse(raw) : null;
    return saved && saved.saleId && Array.isArray(saved.items) ? saved : null;
  } catch { return null; }
}
function writeSaved(locationId, sale) {
  try {
    if (!sale || (sale.items.length === 0 && !sale.phone)) localStorage.removeItem(storageKeyFor(locationId));
    else localStorage.setItem(storageKeyFor(locationId), JSON.stringify(sale));
  } catch { /* private window: the basket just is not kept across a reload */ }
}

/** Money a person took off: its amount in paise against `basePaise`, and what is wrong with it. */
function manualOf(manual, basePaise, label) {
  if (!manual || manual.value === '' || manual.value === null) return { paise: 0, problem: null, send: null };
  const value = Number(manual.value);
  if (!Number.isFinite(value) || value <= 0) return { paise: 0, problem: `Enter how much comes off ${label}.` };
  const amount = manual.mode === 'PERCENT' ? Math.round((basePaise * value) / 100) : paise(manual.value);
  if (manual.mode === 'PERCENT' && value > 100) return { paise: 0, problem: `More than 100% cannot come off ${label}.` };
  if (amount > basePaise) return { paise: 0, problem: `${rupees(amount)} is more than ${label} costs.` };
  if (amount <= 0) return { paise: 0, problem: `Enter how much comes off ${label}.` };
  if ((manual.reason || '').trim().length < REASON_MIN) return { paise: amount, problem: `Say why money is coming off ${label}.` };
  return { paise: amount, problem: null, send: { amount: amount / 100, reason: manual.reason.trim() } };
}

function ManualEditor({ manual, onChange, onRemove, basePaise, disabled }) {
  // Only the change, merged by the parent into the latest state. Merged here into `manual` -- the
  // copy this render was given -- a percent chosen and a value typed in the same moment overwrote
  // each other, and 20 went in as 20 rupees instead of 20%.
  const set = (patch) => onChange(patch);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 90px 1fr auto', gap: 6, alignItems: 'center', marginTop: 8 }}>
      <div role="radiogroup" aria-label="Amount or percent" style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
        {[['AMOUNT', '₹'], ['PERCENT', '%']].map(([mode, label]) => (
          <button key={mode} type="button" role="radio" aria-checked={manual.mode === mode} disabled={disabled}
            onClick={() => set({ mode })}
            style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: manual.mode === mode ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)', fontWeight: manual.mode === mode ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>
      <input className="input-field" inputMode="decimal" aria-label="How much off" placeholder={manual.mode === 'PERCENT' ? '10' : '100'} value={manual.value} disabled={disabled}
        onChange={(e) => { if (/^\d*(\.\d{0,2})?$/.test(e.target.value)) set({ value: e.target.value }); }} style={{ width: '100%', padding: '6px 10px' }} />
      <input className="input-field" aria-label="Why" placeholder="Why? e.g. small mark on the border" maxLength={200} value={manual.reason} disabled={disabled}
        onChange={(e) => set({ reason: e.target.value })} style={{ width: '100%', padding: '6px 10px' }} />
      <button type="button" className="btn-icon" aria-label="Remove discount" onClick={onRemove} disabled={disabled}><X size={15} /></button>
      {manual.mode === 'PERCENT' && Number(manual.value) > 0 && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-secondary)' }}>
          {manual.value}% of {rupees(basePaise)} = {rupees(Math.round((basePaise * Number(manual.value)) / 100))}
        </div>
      )}
    </div>
  );
}

export default function NewSale() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { currentLocation, isLoading: locationsLoading } = useLocationContext();
  const locationId = currentLocation?.id;
  const { can } = usePermission();
  const canDiscount = can('offer:manual_discount');
  const narrow = useMediaQuery('(max-width: 960px)');
  // Selling happens at the counter, on the shop's computer or tablet. A phone screen is too small to
  // scan, check a bill and take split payments without mistakes, so the till is not offered there.
  const phone = useMediaQuery(COUNTER_PHONE_QUERY);

  const [sale, setSale] = useState(null);
  const [done, setDone] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const complete = useCompleteSale();
  // Set in the same tick as the press. isPending only changes on the next render, so a quick double
  // press sent the sale twice -- harmless, the sale id makes it one sale, but a request too many.
  const sending = useRef(false);

  // The basket for this store, kept across a reload (switching store reloads the page).
  useEffect(() => {
    if (!locationId) return;
    const linked = params.get('customer');
    const saved = readSaved(locationId);
    setSale(saved && (!linked || saved.linkedCustomerId === linked) ? saved : newSale(linked));
  }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (locationId && sale) writeSaved(locationId, sale); }, [locationId, sale]);

  const update = (patch) => setSale((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  // ── Customer ───────────────────────────────────────────────────────────────────────────────
  const { data: linkedCustomer } = useCustomerDetails(sale?.linkedCustomerId || null);
  useEffect(() => {
    if (linkedCustomer?.phone && sale && !sale.phone) update({ phone: formatPhone(linkedCustomer.phone) });
  }, [linkedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  const phoneCheck = normalisePhone(sale?.phone);
  const typedDigits = (sale?.phone || '').replace(/\D/g, '').length;
  const byPhone = useCustomerByPhone(phoneCheck.ok ? phoneCheck.value : null);
  const found = phoneCheck.ok ? byPhone.data : null;
  // Chosen from their page, saved before phones were required: the number typed now becomes theirs.
  const linkedNeedsPhone = linkedCustomer && !linkedCustomer.phone && linkedCustomer.id === sale?.linkedCustomerId;
  // The number typed for them is already somebody else's. Switching the sale to that person without a
  // word sold to the wrong customer whenever the cashier did not look up; it has to be a decision.
  const numberBelongsToSomeoneElse = linkedNeedsPhone && found && found.id !== linkedCustomer.id;

  let customer = null;
  let customerProblem = null;
  if (!sale?.phone?.trim()) customerProblem = "Enter the customer's phone number.";
  else if (!phoneCheck.ok) customerProblem = phoneCheck.reason;
  else if (byPhone.isLoading) customerProblem = 'Looking up the number…';
  else if (byPhone.isError) customerProblem = byPhone.error?.message || 'Could not look up the number.';
  else if (numberBelongsToSomeoneElse) customerProblem = `That number is ${found.name}'s. Type ${linkedCustomer.name}'s own number, or sell to ${found.name} instead.`;
  else if (found) customer = { id: found.id };
  else if (linkedNeedsPhone) customer = { id: linkedCustomer.id, phone: phoneCheck.value };
  else if (!sale.name.trim()) customerProblem = "Add the customer's name.";
  else customer = { phone: phoneCheck.value, name: sale.name.trim(), email: sale.email.trim() || null };

  // ── Basket and price ───────────────────────────────────────────────────────────────────────
  const items = sale?.items ?? [];
  const lines = useMemo(() => items.map(i => ({ variantId: i.variantId, quantity: i.quantity })), [items]);
  const quote = usePricingQuote({
    locationId,
    customerId: found?.id || (linkedNeedsPhone ? linkedCustomer.id : null),
    lines,
    couponCodes: sale?.codes ?? []
  });
  const q = quote.data;
  const quoteLine = (variantId) => q?.lines?.find(l => l.variantId === variantId);

  const inBasket = Object.fromEntries(items.map(i => [i.variantId, i.quantity]));
  const addItem = (it) => update((s) => {
    const existing = s.items.find(i => i.variantId === it.variantId);
    if (existing) {
      return { items: s.items.map(i => i.variantId === it.variantId ? { ...i, quantity: Math.min(i.quantity + 1, it.available), available: it.available } : i) };
    }
    return { items: [...s.items, { variantId: it.variantId, title: it.title, sku: it.sku, colorName: it.colorName, size: it.size, price: it.price, available: it.available, quantity: 1, manual: null }] };
  });
  const setItem = (variantId, patch) => update((s) => ({ items: s.items.map(i => i.variantId === variantId ? { ...i, ...patch } : i) }));

  const lineManuals = items.map(item => {
    const line = quoteLine(item.variantId);
    return manualOf(item.manual, line ? paise(line.lineTotal) : 0, item.title);
  });
  const lineManualPaise = lineManuals.reduce((s, m) => s + m.paise, 0);
  const billBase = q ? paise(q.total) - lineManualPaise : 0;
  const bill = manualOf(sale?.billManual, billBase, 'the bill');
  const totalPaise = q ? billBase - bill.paise : 0;
  const payPlan = buildPayments(totalPaise, sale?.payment ?? EMPTY_PAYMENT);

  const addCode = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (!sale.codes.includes(code)) update({ codes: [...sale.codes, code] });
    setCodeInput('');
  };

  // ── What stops the sale ────────────────────────────────────────────────────────────────────
  const problem = !locationId ? 'Choose the store you are selling from in the top bar.'
    : customerProblem
    || (items.length === 0 ? 'Add something to sell.' : null)
    || items.map(i => (i.quantity > i.available ? `Only ${i.available} of ${i.title} here.` : null)).find(Boolean)
    || (quote.isError ? (quote.error?.message || 'Could not price the basket.') : null)
    || (!quote.upToDate ? 'Pricing…' : null)
    || lineManuals.map(m => m.problem).find(Boolean)
    || bill.problem
    || (totalPaise < 0 ? 'The discounts come to more than the bill.' : null)
    || payPlan.problem;

  const submit = () => {
    if (problem || complete.isPending || sending.current) return;
    sending.current = true;
    const body = {
      saleId: sale.saleId,
      locationId,
      quoteId: q.quoteId,
      customer,
      couponCodes: sale.codes,
      manualDiscount: bill.send || undefined,
      items: items.map((i, idx) => ({ variantId: i.variantId, quantity: i.quantity, ...(lineManuals[idx].send ? { manualDiscount: lineManuals[idx].send } : {}) })),
      payments: payPlan.rows
    };
    complete.mutate(body, {
      onSettled: () => { sending.current = false; },
      onSuccess: (res) => {
        setDone({ ...res.data, changePaise: payPlan.changePaise, replayed: res.replayed });
        // The spent quote must not be offered to the next basket that happens to be the same.
        queryClient.removeQueries({ queryKey: ['counter-quote'] });
        const fresh = newSale(null);
        setSale(fresh);
        writeSaved(locationId, null);
      },
      onError: (err) => {
        const code = err?.details?.code;
        if (code === 'PRICE_CHANGED') {
          queryClient.removeQueries({ queryKey: ['counter-quote'] });
          quote.refetch();
          toast.error('Prices changed. Check the bill, then press Complete sale again.');
        } else if (code === 'OUT_OF_STOCK') {
          setItem(err.details.variantId, { available: err.details.available });
          toast.error(err.message);
        } else if (code === 'SALE_ALREADY_COMPLETED') {
          // This basket id was already used for a different sale; keep the basket, give it a new id.
          update({ saleId: crypto.randomUUID() });
          toast.error(`${err.message}`);
        } else {
          toast.error(err?.message || 'The sale could not be completed. Nothing was saved.');
        }
      }
    });
  };

  // ── Screens ────────────────────────────────────────────────────────────────────────────────
  if (phone) {
    return (
      <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px', textAlign: 'center', display: 'grid', gap: 12 }}>
        <MonitorSmartphone size={44} style={{ margin: '0 auto', color: 'var(--text-secondary)' }} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Sell from the counter computer or a tablet</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          New sale needs a bigger screen to scan items, check the bill and take payment. Open Scaleezy on the shop's computer or a tablet.
          {sale && sale.items.length > 0 ? ' The basket started here is kept for this store.' : ''}
        </p>
        <button className="btn-secondary" onClick={() => navigate('/orders')} style={{ justifySelf: 'center' }}>Back to orders</button>
      </div>
    );
  }
  if (locationsLoading || (locationId && !sale)) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}><Loader2 className="animate-spin" /> </div>;
  }
  if (!locationId) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Choose the store you are selling from in the top bar.</div>;
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 16px', textAlign: 'center', display: 'grid', gap: 16 }}>
        <CheckCircle2 size={56} style={{ color: 'var(--accent-success)', margin: '0 auto' }} />
        <h1 style={{ fontSize: 28, margin: 0 }}>Sale complete · {done.orderNumber}</h1>
        <div style={{ color: 'var(--text-secondary)' }}>
          {done.customer?.name} · {formatINRExact(done.total)} paid{done.replayed ? ' (already recorded)' : ''}
        </div>
        {done.changePaise > 0 && (
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-success)' }}>Give back {rupees(done.changePaise)}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" autoFocus onClick={() => window.open(`/orders/${done.id}/receipt?print=1&fresh=1`, '_blank', 'noopener')}
            style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Printer size={16} /> Print receipt
          </button>
          <button className="btn-secondary" onClick={() => setDone(null)} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <ShoppingBag size={16} /> New sale
          </button>
          <Link to={`/orders/${done.id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>View order</Link>
        </div>
      </div>
    );
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16, display: 'grid', gap: 12 };
  const busy = complete.isPending;

  return (
    <div style={{ display: 'grid', gap: 16, paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-icon" aria-label="Back to orders" onClick={() => navigate('/orders')}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>New sale</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Selling from {currentLocation.name}</div>
        </div>
        {(items.length > 0 || sale.phone) && (
          <button className="btn-secondary" disabled={busy} onClick={() => { setSale(newSale(null)); setDone(null); }} style={{ fontSize: 13 }}>Clear</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1.55fr) minmax(320px, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* Left: customer and basket */}
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <section style={card} aria-label="Customer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}><UserRound size={17} /> Customer</div>
            <input className="input-field" type="tel" inputMode="tel" autoComplete="off" aria-label="Customer phone" placeholder="Customer phone, e.g. 98480 22338"
              value={sale.phone} disabled={busy} onChange={(e) => update({ phone: e.target.value })} style={{ width: '100%' }} />
            {sale.phone && !phoneCheck.ok && typedDigits >= 10 && (
              <div role="alert" style={{ fontSize: 13, color: 'var(--accent-warning)' }}>{phoneCheck.reason}</div>
            )}
            {phoneCheck.ok && byPhone.isLoading && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Looking up {formatPhone(phoneCheck.value)}…</div>}
            {numberBelongsToSomeoneElse && (
              <div role="alert" style={{ display: 'grid', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--accent-warning)', color: 'var(--text-primary)' }}>
                <div style={{ fontSize: 14 }}>
                  {formatPhone(found.phone)} is already saved for <strong>{found.name}</strong> ({found.customerCode}). This sale is for {linkedCustomer.name}.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => update({ phone: '' })} style={{ fontSize: 12, padding: '4px 10px' }}>
                    Type {linkedCustomer.name}'s number
                  </button>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => update({ linkedCustomerId: null })} style={{ fontSize: 12, padding: '4px 10px' }}>
                    Sell to {found.name} instead
                  </button>
                </div>
              </div>
            )}
            {found && !numberBelongsToSomeoneElse && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{found.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {[found.customerCode, formatPhone(found.phone), ...(found.tags || [])].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => update({ phone: '', linkedCustomerId: null })} style={{ fontSize: 12, padding: '4px 10px' }}>Not them?</button>
              </div>
            )}
            {linkedNeedsPhone && !found && (
              <div style={{ fontSize: 13, color: 'var(--accent-warning)' }}>{linkedCustomer.name} has no phone saved yet. The number typed here will be saved for them.</div>
            )}
            {phoneCheck.ok && !byPhone.isLoading && !byPhone.isError && !found && !linkedNeedsPhone && (
              <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-secondary)' }}>New customer — saved when the sale is complete.</div>
                <input className="input-field" aria-label="Customer name" placeholder="Name" maxLength={120} value={sale.name} disabled={busy}
                  onChange={(e) => update({ name: e.target.value })} style={{ width: '100%' }} />
                <input className="input-field" type="email" aria-label="Customer email" placeholder="Email (optional)" maxLength={120} value={sale.email} disabled={busy}
                  onChange={(e) => update({ email: e.target.value })} style={{ width: '100%' }} />
              </div>
            )}
          </section>

          <section style={card} aria-label="Items">
            <ItemSearch locationId={locationId} inBasket={inBasket} onAdd={addItem} />
            {items.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Scan or search to add items.</div>
            ) : (
              <div style={{ display: 'grid' }}>
                {items.map((item, idx) => {
                  const line = quoteLine(item.variantId);
                  const manual = lineManuals[idx];
                  const lineTotalPaise = line ? paise(line.lineTotal) - manual.paise : null;
                  return (
                    <div key={item.variantId} style={{ padding: '12px 0', borderTop: idx ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: narrow ? 'wrap' : 'nowrap' }}>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                          <div style={{ fontWeight: 500 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{[item.colorName, item.size, item.sku].filter(Boolean).join(' · ')}</div>
                          {line?.appliedOffers?.map(o => (
                            <div key={o.offerId} style={{ fontSize: 12, color: 'var(--accent-success)', display: 'flex', gap: 4, alignItems: 'center' }}><Tag size={11} /> {o.title} −{formatINRExact(o.amount)}</div>
                          ))}
                          {item.quantity >= item.available && <div style={{ fontSize: 12, color: 'var(--accent-warning)' }}>Only {item.available} here</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button type="button" className="btn-icon" aria-label={`One less ${item.title}`} disabled={busy || item.quantity <= 1} onClick={() => setItem(item.variantId, { quantity: item.quantity - 1 })}><Minus size={14} /></button>
                          <span aria-label="Quantity" style={{ minWidth: 26, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                          <button type="button" className="btn-icon" aria-label={`One more ${item.title}`} disabled={busy || item.quantity >= item.available} onClick={() => setItem(item.variantId, { quantity: item.quantity + 1 })}><Plus size={14} /></button>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 96, marginLeft: 'auto' }}>
                          {line && line.discount > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatINRExact(line.listUnitPrice * line.quantity)}</div>}
                          <div style={{ fontWeight: 600 }}>{lineTotalPaise === null ? '…' : rupees(lineTotalPaise)}</div>
                          {manual.paise > 0 && <div style={{ fontSize: 12, color: 'var(--accent-success)' }}>−{rupees(manual.paise)} by hand</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {canDiscount && !item.manual && (
                            <button type="button" className="btn-icon" aria-label={`Take money off ${item.title}`} title="Discount by hand" disabled={busy}
                              onClick={() => setItem(item.variantId, { manual: { mode: 'AMOUNT', value: '', reason: '' } })}><Percent size={14} /></button>
                          )}
                          <button type="button" className="btn-icon" aria-label={`Remove ${item.title}`} disabled={busy}
                            onClick={() => update((s) => ({ items: s.items.filter(i => i.variantId !== item.variantId) }))}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {item.manual && (
                        <ManualEditor manual={item.manual} basePaise={line ? paise(line.lineTotal) : 0} disabled={busy}
                          onChange={(patch) => update((s) => ({ items: s.items.map(i => i.variantId === item.variantId ? { ...i, manual: { ...i.manual, ...patch } } : i) }))}
                          onRemove={() => setItem(item.variantId, { manual: null })} />
                      )}
                      {manual.problem && item.manual?.value && <div style={{ fontSize: 12, color: 'var(--accent-warning)', marginTop: 4 }}>{manual.problem}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: bill and payment */}
        <div style={{ display: 'grid', gap: 16, minWidth: 0, position: narrow ? 'static' : 'sticky', top: 16 }}>
          <section style={card} aria-label="Bill">
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input-field" aria-label="Offer code" placeholder="Offer code" value={codeInput} disabled={busy} maxLength={60}
                onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCode(); } }} style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn-secondary" disabled={busy || !codeInput.trim()} onClick={addCode}>Apply</button>
            </div>
            {sale.codes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sale.codes.map(code => {
                  const rejected = q?.rejected?.find(r => r.code === code);
                  return (
                    <span key={code} title={rejected?.reason} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, padding: '3px 8px', borderRadius: 999, border: `1px solid ${rejected ? 'var(--accent-warning)' : 'var(--accent-success)'}` }}>
                      {code}{rejected ? ` — ${rejected.reason}` : ''}
                      <button type="button" aria-label={`Remove code ${code}`} disabled={busy} onClick={() => update({ codes: sale.codes.filter(c => c !== code) })}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            {q?.nearMisses?.slice(0, 2).map(n => (
              <div key={n.offerId} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.title}: {n.reason}</div>
            ))}

            <div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Items</span><span>{q ? formatINRExact(q.subtotal) : '—'}</span></div>
              {q?.discounts?.map(d => (
                <div key={d.offerId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-success)' }}><span>{d.title}</span><span>−{formatINRExact(d.amount)}</span></div>
              ))}
              {lineManualPaise > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-success)' }}><span>Taken off lines by hand</span><span>−{rupees(lineManualPaise)}</span></div>}
              {bill.paise > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-success)' }}><span>Off the bill: {sale.billManual.reason}</span><span>−{rupees(bill.paise)}</span></div>}
            </div>
            {canDiscount && items.length > 0 && !sale.billManual && (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => update({ billManual: { mode: 'AMOUNT', value: '', reason: '' } })}
                style={{ justifySelf: 'start', fontSize: 13, padding: '4px 10px', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Percent size={13} /> Discount on the bill</button>
            )}
            {sale.billManual && (
              <>
                <ManualEditor manual={sale.billManual} basePaise={billBase} disabled={busy} onChange={(patch) => update((s) => ({ billManual: { ...s.billManual, ...patch } }))} onRemove={() => update({ billManual: null })} />
                {bill.problem && sale.billManual.value && <div style={{ fontSize: 12, color: 'var(--accent-warning)' }}>{bill.problem}</div>}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
              <span style={{ fontWeight: 600 }}>To pay</span>
              <span style={{ fontSize: 28, fontWeight: 700 }}>
                {items.length === 0 ? rupees(0) : q ? rupees(totalPaise) : '…'}
                {quote.isFetching && <Loader2 size={14} className="animate-spin" style={{ marginLeft: 6 }} />}
              </span>
            </div>
          </section>

          <section style={card} aria-label="Payment">
            <div style={{ fontWeight: 600 }}>Payment</div>
            <PaymentPanel totalPaise={items.length && q ? totalPaise : 0} payment={sale.payment} disabled={busy} onChange={(payment) => update({ payment })} />
            <button type="button" className="btn-primary" onClick={submit} disabled={!!problem || busy}
              style={{ padding: '14px 16px', fontSize: 16, fontWeight: 700, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {busy ? <><Loader2 size={18} className="animate-spin" /> Completing…</> : `Complete sale${q && items.length ? ` · ${rupees(totalPaise)}` : ''}`}
            </button>
            {problem && !busy && <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{problem}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
