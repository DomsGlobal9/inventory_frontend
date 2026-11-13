import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';
import { useShopSetup, useSaveSetup, useSetupPutOff, putOffSetup, OPEN_SETUP_EVENT, SELLS_OPTIONS, sellsLabel } from '../../hooks/useShopSetup';
import CompanyBrandingEditor from '../CompanyBrandingEditor';
import { GENERAL_INFO_CSS } from '../GeneralInfoPanel';
import { START_TOUR_EVENT } from './WelcomeTour';

/**
 * Store setup (13 Nov 2026, PLAN-onboarding-setup.md): shown once to the OWNER, before the welcome tour.
 *
 *   1  Business details  the same form as Settings → Shop details (name, logo, address, phone, email, GST, receipt
 *                        line), so the two can never disagree; "Save and continue" saves it.
 *   2  Products          ready-made, fabrics or both (and the minimum cut length), with a preview of how products will
 *                        appear. It shapes Add product.
 *   3  Complete          what is saved, what is pending (completed any time in Settings), the boutique when
 *                        connected, and the recommended next steps.
 *
 * "Complete later" is always available (also Esc); a reminder stays in the top bar until nothing is pending.
 *
 * Deliberately plain: a flat rail, numbered steps, radio rows, hairline borders. It should read like the rest of a
 * serious business tool, not like a template.
 */
const CUTS = [10, 25, 50, 100];
const metres = (cm) => String(cm / 100);
const STEPS = [
  { title: 'Business details', line: 'Name, address, contact and GST' },
  { title: 'Products', line: 'What your business sells' },
  { title: 'Complete', line: 'Review and next steps' }
];

export default function ShopSetup() {
  const { user } = useAuth();
  const isOwner = !!user && holdsEverything(user);
  const { data: setup } = useShopSetup(isOwner);
  const later = useSetupPutOff();
  const save = useSaveSetup();
  const navigate = useNavigate();
  const details = useRef(null);
  const body = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [sells, setSells] = useState(null);
  const [cut, setCut] = useState(25);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  // Once, for the owner, while it is not complete and not put off for this visit.
  useEffect(() => {
    if (isOwner && setup && !setup.setupDone && !later) setOpen(true);
  }, [isOwner, setup?.setupDone, later]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each step starts at its top, not where the last one was scrolled to.
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [step]);

  // Opened again from the reminder.
  useEffect(() => {
    const again = () => { setStep(0); setProblem(''); setOpen(true); };
    window.addEventListener(OPEN_SETUP_EVENT, again);
    return () => window.removeEventListener(OPEN_SETUP_EVENT, again);
  }, []);

  useEffect(() => {
    if (!setup) return;
    setSells(s => s ?? setup.sells ?? setup.suggested);
    setCut(setup.fabricMinCut ?? 25);
  }, [setup]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && step < 2) { putOffSetup(); setOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  if (!open || !isOwner || !setup) return null;

  const completeLater = () => { putOffSetup(); setOpen(false); };
  const close = () => setOpen(false);
  const go = (path) => { close(); navigate(path); };

  const next = async () => {
    setProblem('');
    if (step === 0) {
      setBusy(true);
      const ok = await details.current?.save?.();
      setBusy(false);
      if (ok !== false) setStep(1);
      return;
    }
    if (step === 1) {
      if (!sells) { setProblem('Please select the products your business sells.'); return; }
      setBusy(true);
      try {
        await save.mutateAsync({ sells, ...(sells !== 'READY_MADE' ? { fabricMinCut: cut } : {}), finish: true });
        setStep(2);
      } catch (e) {
        setProblem(e?.response?.data?.message ?? e?.message ?? 'The changes could not be saved. Please try again.');
      } finally { setBusy(false); }
    }
  };

  const pending = (setup.missing ?? []).filter(m => m !== 'what you sell');
  const firstName = String(user?.name ?? '').trim().split(/\s+/)[0];

  return (
    <div className="ss-backdrop" data-shop-setup>
      <style>{GENERAL_INFO_CSS}{CSS}</style>
      <div className="ss-panel" role="dialog" aria-modal="true" aria-labelledby="ss-title">
        <aside className="ss-rail">
          <div className="ss-brand">ScaleEzy</div>
          <h1 id="ss-title" className="ss-title">Store setup</h1>
          <p className="ss-welcome">{firstName ? `Welcome, ${firstName}. ` : ''}Three short steps and your store is ready to sell.</p>
          <ol className="ss-steps" aria-label="Setup steps">
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'now' : 'next';
              return (
                <li key={s.title} className={`ss-step ${state}`} aria-current={i === step ? 'step' : undefined}>
                  <span className="ss-num">{state === 'done' ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                  <span className="ss-step-text"><span className="ss-step-title">{s.title}</span><span className="ss-step-line">{s.line}</span></span>
                </li>
              );
            })}
          </ol>
          <p className="ss-rail-foot">Each step is saved as you go. Everything can be changed later under Settings.</p>
        </aside>

        <section className="ss-main">
          <div className="ss-mobile-head">
            <span>Store setup</span><span>Step {step + 1} of 3 · {STEPS[step].title}</span>
          </div>
          <div className="ss-body" ref={body}>
            {step === 0 && (
              <>
                <h2 className="ss-h">Business details</h2>
                <p className="ss-sub">These details appear on your invoices, purchase orders and online store. Please review the information provided at registration and complete any missing fields.</p>
                <CompanyBrandingEditor embedded ref={details} />
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="ss-h">Which products does your business sell?</h2>
                <p className="ss-sub">Your selection determines how products are added and displayed. It can be changed at any time under Settings, What you sell.</p>
                {!setup.sells && setup.suggested && (
                  <p className="ss-note">Based on your existing catalogue, <strong>{sellsLabel(setup.suggested)}</strong> has been pre-selected. You may change this selection.</p>
                )}
                <div className="ss-options" role="radiogroup" aria-label="Products your business sells">
                  {SELLS_OPTIONS.map(o => {
                    const on = sells === o.value;
                    return (
                      <button key={o.value} type="button" role="radio" aria-checked={on} className={`ss-option${on ? ' on' : ''}`} onClick={() => { setSells(o.value); setProblem(''); }}>
                        <span className="ss-radio" aria-hidden="true" />
                        <span className="ss-option-text"><span className="ss-option-title">{o.title}</span><span className="ss-option-line">{o.line}</span></span>
                      </button>
                    );
                  })}
                </div>

                {sells && sells !== 'READY_MADE' && (
                  <div className="ss-field">
                    <div>
                      <div className="ss-field-label">Minimum cut length</div>
                      <div className="ss-field-hint">All fabric sales are made in multiples of this length. It can be set individually for each fabric.</div>
                    </div>
                    <div role="radiogroup" aria-label="Minimum cut length" className="ss-seg">
                      {CUTS.map(c => (
                        <button key={c} type="button" role="radio" aria-checked={cut === c} className={cut === c ? 'on' : ''} onClick={() => setCut(c)}>{metres(c)} m</button>
                      ))}
                    </div>
                  </div>
                )}

                {sells && <Preview sells={sells} cut={cut} />}
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="ss-h ss-h-done"><Check size={20} strokeWidth={3} /> Setup complete</h2>
                <p className="ss-sub">{pending.length ? 'A few details are still pending. They can be completed at any time.' : 'Your store is ready. These are the recommended next steps.'}</p>
                <dl className="ss-rows">
                  <div className={pending.length ? 'warn' : ''}>
                    <dt>Business details</dt>
                    <dd>{pending.length ? `Pending: ${pending.join(', ')}` : 'Saved'}</dd>
                    {pending.length > 0 && <button type="button" className="ss-link" onClick={() => setStep(0)}>Complete now</button>}
                  </div>
                  <div>
                    <dt>Products</dt>
                    <dd>{sellsLabel(setup.sells)}{setup.sells !== 'READY_MADE' ? `, sold in multiples of ${metres(setup.fabricMinCut)} m` : ''}</dd>
                  </div>
                  {setup.boutique?.linked && (
                    <div>
                      <dt>Boutique</dt>
                      <dd>Connected ({setup.boutique.tenant}). Items and stock are synchronised automatically, at the prices set in the boutique.</dd>
                    </div>
                  )}
                </dl>
                <h3 className="ss-h3">Recommended next steps</h3>
                <ul className="ss-next-list">
                  <NextStep title="Add your first product" line="Photos, prices and stock in one flow." onClick={() => go('/add')} />
                  <NextStep title="Import your catalogue" line="Bring products in from a spreadsheet." onClick={() => go('/products')} />
                  <NextStep title="Open your online store" line="Share a link and start taking orders." onClick={() => go('/settings?section=ONLINE_SHOP')} />
                  <NextStep title="Invite your team" line="Give staff their own sign-in and access." onClick={() => go('/settings?section=USERS')} />
                </ul>
              </>
            )}
            {problem && <div role="alert" className="ss-problem"><AlertCircle size={16} /> <span>{problem}</span></div>}
          </div>

          <footer className="ss-foot">
            {step < 2 ? (
              <>
                <button type="button" className="ss-later" onClick={completeLater}>Complete later</button>
                <div className="ss-foot-right">
                  {step > 0 && <button type="button" className="btn-secondary" onClick={() => { setProblem(''); setStep(step - 1); }} disabled={busy}>Back</button>}
                  <button type="button" className="btn-primary ss-primary" onClick={next} disabled={busy}>
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {step === 1 ? 'Complete setup' : 'Save and continue'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" className="ss-later" onClick={() => { close(); window.dispatchEvent(new CustomEvent(START_TOUR_EVENT)); }}>Take a quick tour</button>
                <button type="button" className="btn-primary ss-primary" onClick={close}>Go to dashboard</button>
              </>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}

function NextStep({ title, line, onClick }) {
  return (
    <li>
      <button type="button" className="ss-next-row" onClick={onClick}>
        <span><strong>{title}</strong><span>{line}</span></span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

/** How products will appear with this choice, drawn as the plain list rows the app itself uses. */
function Preview({ sells, cut }) {
  return (
    <div className="ss-preview" aria-label="Preview">
      <div className="ss-preview-label">Preview</div>
      {sells !== 'FABRICS' && (
        <div className="pv-row">
          <span className="pv-swatch" style={{ background: '#9c2148' }} />
          <span className="pv-name">Kanchipuram silk saree</span>
          <span className="pv-detail">Sizes S, M, L, XL</span>
          <span className="pv-price">₹12,500 <small>per piece</small></span>
        </div>
      )}
      {sells !== 'READY_MADE' && (
        <div className="pv-row">
          <span className="pv-swatch" style={{ background: '#7a1f1f' }} />
          <span className="pv-name">Raw silk, maroon <small>112 cm wide</small></span>
          <span className="pv-detail">24.50 m in stock · sold in {metres(cut)} m steps</span>
          <span className="pv-price">₹450 <small>per metre</small></span>
        </div>
      )}
    </div>
  );
}

const CSS = `
.ss-backdrop { position: fixed; inset: 0; z-index: 1200; background: rgba(12, 20, 14, 0.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.ss-panel { width: 100%; max-width: 1040px; height: min(740px, calc(100vh - 48px)); display: grid; grid-template-columns: 280px minmax(0, 1fr); background: var(--bg-card); color: var(--text-primary); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.25); }

.ss-rail { background: #164B1E; color: #fff; padding: 32px 28px; display: flex; flex-direction: column; }
.ss-brand { font-size: 12px; font-weight: 600; color: #A6D92B; letter-spacing: .02em; }
.ss-title { margin: 6px 0 10px; font-size: 22px; font-weight: 700; color: #fff; }
.ss-welcome { margin: 0 0 28px; font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,.75); }
.ss-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.ss-step { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0 10px 12px; border-left: 3px solid transparent; }
.ss-step.now { border-left-color: #A6D92B; }
.ss-num { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 1.5px solid rgba(255,255,255,.4); color: rgba(255,255,255,.75); }
.ss-step.now .ss-num { border-color: #A6D92B; color: #A6D92B; }
.ss-step.done .ss-num { background: #A6D92B; border-color: #A6D92B; color: #164B1E; }
.ss-step-text { display: grid; gap: 1px; }
.ss-step-title { font-size: 14px; font-weight: 600; color: #fff; }
.ss-step.next .ss-step-title { color: rgba(255,255,255,.65); }
.ss-step-line { font-size: 12px; color: rgba(255,255,255,.55); }
.ss-rail-foot { margin: auto 0 0; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,.55); }

.ss-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.ss-mobile-head { display: none; }
.ss-body { padding: 32px 36px; overflow-y: auto; flex: 1; min-height: 0; }
.ss-h { margin: 0 0 6px; font-size: 20px; font-weight: 700; }
.ss-h-done { display: flex; align-items: center; gap: 8px; }
.ss-h-done svg { color: var(--accent-success, #1f8b4c); }
.ss-h3 { margin: 28px 0 8px; font-size: 14px; font-weight: 700; }
.ss-sub { margin: 0 0 22px; color: var(--text-muted); font-size: 14px; line-height: 1.55; max-width: 620px; }
.ss-note { margin: 0 0 16px; padding: 10px 12px; border-left: 3px solid #A6D92B; background: var(--bg-hover, rgba(0,0,0,.03)); font-size: 13px; line-height: 1.5; }

.ss-options { border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; }
.ss-option { width: 100%; display: flex; gap: 14px; align-items: flex-start; text-align: left; padding: 16px 18px; border: 0; border-top: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); cursor: pointer; }
.ss-option:first-child { border-top: 0; }
.ss-option:hover { background: var(--bg-hover, rgba(0,0,0,.025)); }
.ss-option.on { background: rgba(166, 217, 43, .1); box-shadow: inset 3px 0 0 #164B1E; }
.ss-radio { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--text-muted); flex-shrink: 0; margin-top: 2px; position: relative; }
.ss-option.on .ss-radio { border-color: #164B1E; }
.ss-option.on .ss-radio::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: #164B1E; }
.ss-option-text { display: grid; gap: 2px; }
.ss-option-title { font-weight: 600; font-size: 14.5px; }
.ss-option-line { font-size: 13px; color: var(--text-muted); }

.ss-field { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.ss-field-label { font-weight: 600; font-size: 14px; }
.ss-field-hint { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; max-width: 400px; }
.ss-seg { display: inline-flex; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; }
.ss-seg button { border: 0; border-left: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); padding: 8px 14px; font-size: 13px; cursor: pointer; min-width: 58px; }
.ss-seg button:first-child { border-left: 0; }
.ss-seg button.on { background: #164B1E; color: #fff; font-weight: 600; }

.ss-preview { margin-top: 24px; border: 1px solid var(--border-light); border-radius: 10px; }
.ss-preview-label { padding: 10px 16px; font-size: 12px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); }
.pv-row { display: grid; grid-template-columns: 32px minmax(0, 1.4fr) minmax(0, 1.3fr) auto; gap: 14px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--border-light); font-size: 13px; }
.pv-row:nth-child(2) { border-top: 0; }
.pv-swatch { width: 32px; height: 32px; border-radius: 6px; }
.pv-name { font-weight: 600; }
.pv-name small, .pv-price small { font-weight: 400; color: var(--text-muted); font-size: 12px; margin-left: 4px; }
.pv-detail { color: var(--text-muted); }
.pv-price { font-weight: 600; white-space: nowrap; }

.ss-rows { margin: 0; border: 1px solid var(--border-light); border-radius: 10px; }
.ss-rows > div { display: grid; grid-template-columns: 160px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; padding: 14px 16px; border-top: 1px solid var(--border-light); font-size: 13.5px; }
.ss-rows > div:first-child { border-top: 0; }
.ss-rows dt { font-weight: 600; }
.ss-rows dd { margin: 0; color: var(--text-secondary, var(--text-muted)); line-height: 1.5; }
.ss-rows > div.warn dd { color: #8a6100; }
.ss-link { background: none; border: 0; padding: 0; color: #164B1E; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
.ss-link:hover { text-decoration: underline; }
.ss-next-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; }
.ss-next-list li + li { border-top: 1px solid var(--border-light); }
.ss-next-row { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border: 0; background: var(--bg-card); color: var(--text-primary); text-align: left; cursor: pointer; }
.ss-next-row:hover { background: var(--bg-hover, rgba(0,0,0,.025)); }
.ss-next-row > span { display: grid; gap: 2px; font-size: 14px; }
.ss-next-row > span > span { font-size: 12.5px; color: var(--text-muted); }
.ss-next-row svg { color: var(--text-muted); flex-shrink: 0; }

.ss-problem { margin-top: 16px; display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-left: 3px solid var(--accent-danger, #dc2626); background: rgba(220, 38, 38, .06); color: var(--accent-danger, #dc2626); font-size: 13px; line-height: 1.5; }
.ss-problem svg { flex-shrink: 0; margin-top: 2px; }
.ss-foot { border-top: 1px solid var(--border-light); padding: 14px 36px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--bg-card); }
.ss-foot-right { display: flex; gap: 10px; align-items: center; }
.ss-primary { display: inline-flex; align-items: center; gap: 8px; }
.ss-later { background: none; border: 0; color: var(--text-muted); font-size: 13.5px; cursor: pointer; padding: 8px 0; }
.ss-later:hover { color: var(--text-primary); text-decoration: underline; }
.ss-option:focus-visible, .ss-seg button:focus-visible, .ss-later:focus-visible, .ss-next-row:focus-visible, .ss-link:focus-visible { outline: 2px solid #A6D92B; outline-offset: -2px; }

@media (max-width: 900px) {
  .ss-backdrop { padding: 0; }
  .ss-panel { grid-template-columns: 1fr; max-width: none; height: 100%; border-radius: 0; }
  .ss-rail { display: none; }
  .ss-mobile-head { display: flex; justify-content: space-between; gap: 12px; padding: 14px 20px; background: #164B1E; color: #fff; font-size: 13px; }
  .ss-mobile-head span:first-child { font-weight: 700; }
  .ss-mobile-head span:last-child { color: rgba(255,255,255,.75); }
  .ss-body { padding: 22px 20px; }
  .ss-foot { padding: 12px 20px; }
}
@media (max-width: 560px) {
  .pv-row { grid-template-columns: 32px minmax(0, 1fr) auto; }
  .pv-detail { grid-column: 2 / 4; grid-row: 2; }
  .ss-rows > div { grid-template-columns: minmax(0, 1fr) auto; }
  .ss-rows dd { grid-column: 1 / 3; }
  .ss-seg { width: 100%; }
  .ss-seg button { flex: 1; min-width: 0; }
}
`;

/** The phone's reminder: a slim strip under the top bar, where the bar itself has no room. */
export function SetupReminderStrip() {
  const { user } = useAuth();
  const isOwner = !!user && holdsEverything(user);
  const { data: setup } = useShopSetup(isOwner);
  if (!isOwner || !setup || (setup.setupDone && !(setup.missing?.length))) return null;
  const left = setup.missing?.length ?? 0;
  return (
    <button type="button" className="setup-strip" onClick={() => window.dispatchEvent(new Event(OPEN_SETUP_EVENT))}>
      <span>Complete your store setup{left ? ` · ${left} pending` : ''}</span>
      <ChevronRight size={16} aria-hidden="true" />
      <style>{`
        .setup-strip { display: none; }
        @media (max-width: 720px) {
          .setup-strip { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 16px; border: 0; border-bottom: 1px solid #e7cf7a; background: #fdf6dc; color: #5c4400; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
        }
      `}</style>
    </button>
  );
}
