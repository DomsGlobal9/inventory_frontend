import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateDerivedViews } from '../lib/invalidate';
import { X, Upload, Download, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { parseImportFile, buildTemplateCsv } from '../utils/importParse';

/**
 * Bringing a whole catalogue in from one file.
 *
 * The shape of this screen is the point: a file is read, and then NOTHING happens until the
 * merchant has seen what it would do and pressed the button. The preview is not a courtesy
 * -- it is the thing that makes re-uploading safe, and the "unchanged" line is how somebody
 * learns that re-uploading is safe.
 */

const Stat = ({ label, products, variants, tone }) => (
  <div style={{ flex: '1 1 120px', minWidth: 0, padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '20px', fontWeight: 700, color: tone || 'var(--text-primary)', lineHeight: 1.1 }}>
      {variants}
    </div>
    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
      {variants === 1 ? 'variant' : 'variants'}{products != null ? ` · ${products} ${products === 1 ? 'product' : 'products'}` : ''}
    </div>
  </div>
);

const IssueList = ({ items, tone, icon: Icon, title, limit = 8 }) => {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: tone, fontSize: '13px', fontWeight: 600 }}>
        <Icon size={15} /> {title} ({items.length})
      </div>
      <div style={{ maxHeight: '170px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
        {items.slice(0, limit).map((it, i) => (
          <div key={i} style={{ padding: '8px 12px', borderBottom: i === Math.min(items.length, limit) - 1 ? 'none' : '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ color: tone, fontWeight: 600 }}>
              {it.rowNumber ? `Row ${it.rowNumber}` : 'This file'}
            </span>{' — '}{it.message}
          </div>
        ))}
        {items.length > limit && (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            …and {items.length - limit} more. Fix these first; the rest are often the same mistake.
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProductImportModal({ isOpen, onClose, onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [acceptWarnings, setAcceptWarnings] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const reset = () => { setFile(null); setRows(null); setPlan(null); setAcceptWarnings(false); };

  const close = () => { reset(); onClose(); };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'product-import-template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Read, then immediately ask the server what it would do. Two steps for the code, one
  // action for the person: they drop a file and see the answer.
  const accept = async (f) => {
    if (!f) return;
    reset();
    setFile(f);
    setBusy(true);
    try {
      const parsed = await parseImportFile(f);
      if (!parsed.length) { toast.error('That file has no rows in it.'); setBusy(false); return; }
      setRows(parsed);
      const res = await api.post('/products/import/validate', { rows: parsed });
      setPlan(res.data);
    } catch (err) {
      toast.error(err?.message || 'Could not read that file.');
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await api.post('/products/import/apply', { rows, fingerprint: plan.fingerprint });
      const d = res.data;
      toast.success(`Imported ${d.createdProducts} products and ${d.createdVariants + d.updatedVariants} variants`);
      // Stock, values and alerts all moved: the bell and Stock alerts are re-checked on the
      // server, and every screen that shows them asks again.
      invalidateDerivedViews(queryClient);
      onImported?.();
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'The import could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const s = plan?.summary;
  const hasWarnings = plan?.warnings?.length > 0;
  const blockedByWarnings = hasWarnings && !acceptWarnings;

  return (
    createPortal(<>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '680px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', zIndex: 1000
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Import products</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Add or update your catalogue from an Excel or CSV file. Nothing is saved until you say so.
            </p>
          </div>
          <button className="btn-icon" onClick={close} title="Close"><X size={18} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          {!plan && (
            <>
              <button className="btn-secondary" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Download size={15} /> Download template
              </button>

              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files?.[0]); }}
                style={{
                  border: dragOver ? '2px solid var(--accent-gold)' : '1px dashed var(--border-focus)',
                  background: dragOver ? 'rgba(212,175,55,0.08)' : 'var(--bg-input)',
                  borderRadius: '12px', padding: '36px 20px', textAlign: 'center', cursor: 'pointer'
                }}
              >
                {busy ? <Loader2 size={30} className="animate-spin" color="var(--text-secondary)" />
                      : <FileSpreadsheet size={30} color="var(--text-secondary)" />}
                <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {busy ? 'Reading your file…' : (file ? file.name : 'Choose a file, or drop one here')}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  .xlsx or .csv · one row per variant
                </div>
                <input
                  ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.xlsm"
                  style={{ display: 'none' }}
                  onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
                />
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.6 }}>
                Rows of the same new product share a <strong>ProductKey</strong> you invent — it just groups
                them and is never saved. To update products you already have, export them first: the file
                comes back with <strong>ProductCode</strong> filled in. An empty cell never erases anything.
              </p>
            </>
          )}

          {plan && (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Stat label="New" products={s.newProducts} variants={s.newVariants} tone="var(--accent-success)" />
                <Stat label="Update" products={s.updatedProducts} variants={s.updatedVariants} tone="var(--accent-gold)" />
                <Stat label="Unchanged" products={null} variants={s.unchangedVariants} />
              </div>

              <IssueList items={plan.errors} tone="var(--accent-danger)" icon={AlertTriangle} title="Must be fixed" />
              <IssueList items={plan.warnings} tone="var(--accent-warning)" icon={AlertTriangle} title="Worth checking" />

              {plan.canApply && hasWarnings && (
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '14px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={acceptWarnings} onChange={(e) => setAcceptWarnings(e.target.checked)} style={{ marginTop: '2px' }} />
                  <span>I have read the warnings above and want to import anyway.</span>
                </label>
              )}

              {plan.canApply && !hasWarnings && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', color: 'var(--accent-success)', fontSize: '13px' }}>
                  <CheckCircle2 size={16} /> Nothing to fix. Ready to import.
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={plan ? reset : close} disabled={busy}>
            {plan ? 'Choose another file' : 'Cancel'}
          </button>
          {plan && (
            <button
              className="btn-primary"
              disabled={!plan.canApply || blockedByWarnings || busy}
              onClick={runImport}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (!plan.canApply || blockedByWarnings) ? 0.5 : 1 }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import {s.newVariants + s.updatedVariants} {s.newVariants + s.updatedVariants === 1 ? 'variant' : 'variants'}
            </button>
          )}
        </div>
      </div>
    </>, document.body)
  );
}
