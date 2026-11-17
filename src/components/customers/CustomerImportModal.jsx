import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';
import { useCrm } from '../../hooks/useCrm';
import ConfirmModal from '../ConfirmModal';
import { CUSTOMER_COLUMNS, parseCustomerFile, downloadCustomerExample } from '../../utils/customerImport';

/**
 * Import customers (17 Nov 2026, mockup PLAN-customer-import-mockups.html, approved by the owner).
 * 1. choose the file  2. check it: what is added, what is left alone, what cannot be added, and why; nothing is added
 * until the box is ticked  3. done, and the shop's imports, each of which the owner can take back out.
 */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Count({ n, label, tone }) {
  return (
    <div className="ci-count">
      <b style={{ color: tone }}>{fmt(n)}</b>
      <span>{label}</span>
    </div>
  );
}

function YourImports({ imports, mayTakeBack, crmDeletes, onTakeBack }) {
  if (!imports?.length) return null;
  return (
    <div className="ci-past">
      <b>Your imports</b>
      {imports.map(i => (
        <div className="ci-past-row" key={i.source}>
          <div>
            {i.fileName}
            <span>{when(i.at)} · {fmt(i.added)} added{i.stillHere !== i.added ? ` · ${fmt(i.stillHere)} still in the list` : ''}{i.by ? ` · by ${i.by}` : ''}</span>
          </div>
          {mayTakeBack && !crmDeletes && i.stillHere > 0 && (
            <button type="button" className="btn-secondary ci-small" onClick={() => onTakeBack(i)}>Take back out</button>
          )}
        </div>
      ))}
      {mayTakeBack && crmDeletes && <p className="ci-note">This shop deletes customers in CRM, so an import is taken out there, one customer at a time.</p>}
    </div>
  );
}

export default function CustomerImportModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const crm = useCrm();
  const owner = holdsEverything(user);
  const titleId = useId();
  const inputRef = useRef(null);
  const [step, setStep] = useState('choose');      // choose | check | done
  const [file, setFile] = useState(null);          // { fileName, rows, unused }
  const [result, setResult] = useState(null);      // the server's check
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [takeBack, setTakeBack] = useState(null);  // { import, preview }

  const imports = useQuery({
    queryKey: ['customer-imports'],
    queryFn: async () => (await api.get('/customers/imports')).data || [],
    enabled: open,
    meta: { quiet: true }
  });

  const reset = () => { setStep('choose'); setFile(null); setResult(null); setAgreed(false); setProblem(''); setDone(null); };
  const close = () => { if (busy) return; reset(); onClose(); };
  const dialogRef = useDialog(open, { onClose: close, canClose: !busy && !takeBack });

  const checkRows = async (f) => {
    setBusy(true); setProblem('');
    try {
      const r = (await api.post('/customers/import/check', { rows: f.rows })).data;
      setResult(r); setAgreed(false); setStep('check');
    } catch (e) {
      setProblem(e?.message || 'The file could not be checked. Try again.');
    } finally { setBusy(false); }
  };

  const accept = async (picked) => {
    if (!picked || busy) return;
    setProblem('');
    setBusy(true);
    let f;
    try { f = await parseCustomerFile(picked); }
    catch (e) { setProblem(e?.message || 'That file could not be read.'); setBusy(false); return; }
    setBusy(false);
    setFile(f);
    await checkRows(f);
  };

  const add = async () => {
    if (!agreed || busy || !result?.counts?.add) return;
    setBusy(true); setProblem('');
    try {
      const r = (await api.post('/customers/import', { fileName: file.fileName, rows: file.rows, expected: result.counts.add })).data;
      setDone(r); setStep('done');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-imports'] });
    } catch (e) {
      const why = e?.message || 'The customers could not be added. Nothing was changed. Try again.';
      // The list changed since the check: check again so the numbers on screen are true, and keep saying why they
      // changed (the check clears old messages). The tick is cleared by the check, so the new numbers are agreed to.
      if (e?.statusCode === 409) await checkRows(file);
      setProblem(why);
    } finally { setBusy(false); }
  };

  const askTakeBack = async (imp) => {
    try {
      const preview = (await api.get(`/customers/imports/${encodeURIComponent(imp.source)}/take-back`)).data;
      setTakeBack({ imp, preview });
    } catch (e) { toast.error(e?.message || 'That import could not be read. Try again.'); }
  };

  if (!open) return null;
  const c = result?.counts;
  const notAdded = (c?.existing ?? 0) + (c?.repeated ?? 0) + (c?.bad ?? 0);

  return createPortal(
    <>
      <style>{CSS}</style>
      <div className="ci-shade" onClick={close} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="ci-box">
        <div className="ci-head">
          <h2 id={titleId}>Import customers</h2>
          <button type="button" className="btn-icon" onClick={close} aria-label="Close" disabled={busy}><X size={18} /></button>
        </div>

        <div className="ci-body">
          {step === 'choose' && (
            <>
              <p className="ci-lead">An Excel or CSV file, one customer a row. Only the name and the phone number are needed.</p>
              <table className="ci-cols">
                <thead><tr><th>Column</th><th>Example</th></tr></thead>
                <tbody>
                  {CUSTOMER_COLUMNS.map(col => (
                    <tr key={col.head}><td className={col.need ? 'ci-need' : ''}>{col.head}</td><td>{col.example}</td></tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="ci-link" onClick={() => downloadCustomerExample().catch(() => toast.error('The example file could not be made. Try again.'))}>
                <Download size={14} /> Download the example file (Excel)
              </button>
              <div
                className={`ci-drop${dragOver ? ' ci-over' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Choose a file"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files?.[0]); }}
              >
                {busy ? <Loader2 size={26} className="animate-spin" /> : <FileSpreadsheet size={26} />}
                <b>{busy ? 'Reading your file...' : 'Choose a file'}</b>
                <span>or drop it here · .xlsx or .csv · up to 5,000 customers</span>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
              {problem && <p className="ci-problem" role="alert">{problem}</p>}
              <p className="ci-note">Nobody gets WhatsApp offers from an import. A list is not their yes: each customer agrees at the till or in the shop.</p>
              <YourImports imports={imports.data} mayTakeBack={owner} crmDeletes={crm.profileMoved} onTakeBack={askTakeBack} />
            </>
          )}

          {step === 'check' && c && (
            <>
              <p className="ci-lead"><b>{file.fileName}</b> · {fmt(result.rows)} {result.rows === 1 ? 'row' : 'rows'}</p>
              <div className="ci-counts">
                <Count n={c.add} label={c.add === 1 ? 'new customer' : 'new customers'} tone="var(--accent-success)" />
                <Count n={c.existing} label="already in your list" />
                <Count n={c.bad + c.repeated} label="cannot be added" tone={c.bad + c.repeated ? 'var(--accent-danger)' : undefined} />
              </div>
              {result.notes.length > 0 && (
                <div className="ci-lines" aria-label="Rows that will not be added">
                  {result.notes.map(n => (
                    <div className="ci-line" key={`${n.row}-${n.say}`}>
                      <span className="ci-row">Row {n.row}</span>
                      <span className={n.kind === 'BAD' ? 'ci-bad' : 'ci-skip'}>{n.say}</span>
                    </div>
                  ))}
                  {result.moreNotes > 0 && <div className="ci-line"><span className="ci-skip">...and {fmt(result.moreNotes)} more rows like these.</span></div>}
                </div>
              )}
              {file.unused?.length > 0 && <p className="ci-note">Not used from your file: {file.unused.join(', ')}.</p>}
              {c.add > 0 ? (
                <label className="ci-tick">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy} />
                  <span>{notAdded ? `Add the ${fmt(c.add)} new ${c.add === 1 ? 'customer' : 'customers'} and leave out the ${fmt(notAdded)} ${notAdded === 1 ? 'row' : 'rows'} above.` : `Add the ${fmt(c.add)} new ${c.add === 1 ? 'customer' : 'customers'}.`}</span>
                </label>
              ) : (
                <p className="ci-problem">There is nobody new to add in this file.</p>
              )}
              {problem && <p className="ci-problem" role="alert">{problem}</p>}
              <p className="ci-note">Customers already in your list are never changed by an import.</p>
            </>
          )}

          {step === 'done' && done && (
            <>
              <div className="ci-done"><b>{fmt(done.created)}</b>{done.created === 1 ? 'customer' : 'customers'} added from {done.fileName}</div>
              <p className="ci-note">They are in Customers now and the till finds them by number.{crm.on ? ' CRM gets them within a few minutes (a big file takes longer).' : ''}</p>
              <YourImports imports={imports.data} mayTakeBack={owner} crmDeletes={crm.profileMoved} onTakeBack={askTakeBack} />
            </>
          )}
        </div>

        <div className="ci-foot">
          {step === 'choose' && <button type="button" className="btn-secondary" onClick={close}>Cancel</button>}
          {step === 'check' && (
            <>
              <button type="button" className="btn-secondary" onClick={() => { reset(); }} disabled={busy}>Choose another file</button>
              {c?.add > 0 && (
                <button type="button" className="btn-primary" onClick={add} disabled={!agreed || busy}>
                  {busy ? 'Adding...' : `Add ${fmt(c.add)} ${c.add === 1 ? 'customer' : 'customers'}`}
                </button>
              )}
            </>
          )}
          {step === 'done' && <button type="button" className="btn-primary" onClick={close}>Done</button>}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!takeBack}
        onClose={() => setTakeBack(null)}
        title={`Take ${takeBack?.imp?.fileName ?? 'this import'} back out?`}
        message={takeBack ? (takeBack.preview.willGo
          ? `${fmt(takeBack.preview.willGo)} ${takeBack.preview.willGo === 1 ? 'customer goes' : 'customers go'} from your list.${takeBack.preview.willStay ? ` ${fmt(takeBack.preview.willStay)} ${takeBack.preview.willStay === 1 ? 'stays' : 'stay'}, because the shop has used ${takeBack.preview.willStay === 1 ? 'them' : 'them'} since (a bill, points, an edit).` : ''} This cannot be undone.`
          : `Every customer from this import has been used since, so nobody would be taken out. They stay as ordinary customers.`) : ''}
        confirmText={takeBack?.preview?.willGo ? 'Take back out' : 'Clear it from the list'}
        confirmStyle="danger"
        onConfirm={async () => {
          try {
            const r = (await api.post(`/customers/imports/${encodeURIComponent(takeBack.imp.source)}/take-back`)).data;
            // CRM erases each one from the feed: a big import takes a few minutes to leave CRM (5,000 took about 7).
            toast.success(r.removed ? `${fmt(r.removed)} ${r.removed === 1 ? 'customer' : 'customers'} taken back out${crm.on ? '. CRM catches up within a few minutes.' : ''}` : 'Cleared from your imports');
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer-imports'] });
          } catch (e) { toast.error(e?.message || 'It could not be taken back out. Nothing was changed.'); throw e; }
        }}
      />
    </>,
    document.body
  );
}

const CSS = `
/* Below ConfirmModal (1000), so "Take back out?" opens on top of this window, not behind it. */
.ci-shade { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 998; }
.ci-box { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 620px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; z-index: 999; box-shadow: var(--shadow-modal); }
.ci-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
.ci-head h2 { margin: 0; font-size: 17px; color: var(--text-primary); }
.ci-body { padding: 18px 20px; overflow-y: auto; font-size: 13.5px; line-height: 1.55; color: var(--text-primary); }
.ci-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border-light); flex-wrap: wrap; }
.ci-lead { margin: 0 0 10px; }
.ci-cols { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 4px 0 8px; }
.ci-cols th, .ci-cols td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-light); }
/* The app's table headings stick to the top when a page scrolls; inside this window that drew them over the rows. */
.ci-cols th { color: var(--text-secondary); font-weight: 600; font-size: 11.5px; position: static; background: none; }
.ci-need { color: var(--brand-ink); font-weight: 600; }
.ci-link { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; padding: 4px 0; color: var(--brand-ink); font: inherit; font-weight: 600; cursor: pointer; }
.ci-link:hover { text-decoration: underline; }
.ci-drop { margin: 12px 0; border: 1.5px dashed var(--border-focus); border-radius: 10px; padding: 24px 16px; text-align: center; color: var(--text-secondary);
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: var(--bg-input); }
.ci-drop b { color: var(--text-primary); font-size: 14px; }
.ci-drop span { font-size: 12.5px; }
.ci-drop:focus-visible, .ci-over { border-color: var(--accent-primary); outline: none; }
.ci-problem { margin: 10px 0 0; color: var(--accent-danger); font-size: 13px; }
.ci-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 6px; background: var(--bg-input); color: var(--text-secondary); font-size: 12.5px; }
.ci-counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 4px 0 14px; }
.ci-count { border: 1px solid var(--border-light); border-radius: 8px; padding: 10px; }
.ci-count b { display: block; font-size: 20px; }
.ci-count span { font-size: 12px; color: var(--text-secondary); }
.ci-lines { border: 1px solid var(--border-light); border-radius: 8px; max-height: 200px; overflow-y: auto; }
.ci-line { display: flex; gap: 10px; padding: 8px 10px; border-bottom: 1px solid var(--border-light); font-size: 12.5px; }
.ci-line:last-child { border-bottom: 0; }
.ci-row { color: var(--text-muted); width: 62px; flex: none; }
.ci-bad { color: var(--accent-danger); }
.ci-skip { color: var(--text-secondary); }
.ci-tick { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; cursor: pointer; }
.ci-tick input { margin-top: 1px; }
.ci-done { text-align: center; padding: 6px 0 2px; }
.ci-done b { display: block; font-size: 28px; color: var(--accent-success); }
.ci-past { margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 12px; }
.ci-past-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; }
.ci-past-row span { display: block; color: var(--text-secondary); font-size: 12px; }
.ci-small { padding: 6px 10px; font-size: 12.5px; white-space: nowrap; }
@media (max-width: 560px) {
  /* Side by side even on a phone: three small figures read at a glance; stacked they pushed the reasons off screen. */
  .ci-counts { gap: 6px; }
  .ci-count { padding: 8px; }
  .ci-count b { font-size: 18px; }
  .ci-count span { font-size: 11.5px; line-height: 1.3; display: block; }
  .ci-row { width: 52px; }
  .ci-past-row { flex-direction: column; align-items: flex-start; }
}
`;
