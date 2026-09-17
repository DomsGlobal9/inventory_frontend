import React, { useEffect, useState } from 'react';
import { Upload, X, Loader2, Download } from 'lucide-react';
import { useImportSpots } from '../../hooks/useShelves';

/**
 * Addresses from a spreadsheet: for a godown with hundreds of spots, or a layout already written down.
 * Columns: address (required), name, kind, colour, capacity, shop_floor. Row order is walking order.
 */

const TEMPLATE = 'address,name,kind,colour,capacity,shop_floor\nFLOOR-C1-1,Silk sarees,shelf,,40,yes\nFLOOR-C1-2,Cotton sarees,shelf,,40,yes\nSTORE-R01-1-A,Blue carton,box,#2563eb,,no\n';

/** A small CSV reader: commas, quoted fields, doubled quotes, CRLF. Enough for a spreadsheet export. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

const HEADERS = { address: 'address', name: 'name', kind: 'kind', colour: 'colour', color: 'colour', capacity: 'capacity', shop_floor: 'shopFloor', shopfloor: 'shopFloor', 'shop floor': 'shopFloor' };

export function rowsFromCsv(text) {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], problem: 'The file is empty.' };
  const head = table[0].map(h => h.trim().toLowerCase());
  const hasHeader = head.includes('address');
  const columns = hasHeader ? head.map(h => HEADERS[h] ?? null) : ['address', 'name', 'kind', 'colour', 'capacity', 'shopFloor'];
  if (!columns.includes('address')) return { rows: [], problem: 'There is no "address" column.' };
  const body = hasHeader ? table.slice(1) : table;
  return {
    rows: body.map(cells => Object.fromEntries(columns.map((c, i) => [c, (cells[i] ?? '').trim()]).filter(([c]) => c))),
    problem: body.length === 0 ? 'The file has a header but no rows.' : null
  };
}

export default function ImportAddresses({ locationId, onClose }) {
  const [text, setText] = useState('');
  const preview = useImportSpots({ silent: true });
  const save = useImportSpots();
  const parsed = text.trim() ? rowsFromCsv(text) : { rows: [], problem: null };

  useEffect(() => {
    if (!parsed.rows.length || parsed.problem) return;
    const t = setTimeout(() => preview.mutate({ locationId, rows: parsed.rows, preview: true }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, locationId]);

  const result = preview.data;
  const readFile = (file) => {
    if (!file) return;
    if (file.size > 1_000_000) { setText(''); return; }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <div className="sh-card" style={{ display: 'grid', gap: 14 }}>
      <div className="sh-row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}><Upload size={18} /> Import addresses</h2>
        <button type="button" className="sh-iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>
      <p className="sh-muted" style={{ margin: 0 }}>
        One row per shelf or box: <span className="sh-addr">address</span>, then optionally name, kind, colour, capacity and shop_floor (yes/no).
        Racks and areas above each address are made for you. Rows keep their order as the walking order.
      </p>
      <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Upload size={14} /> Choose a CSV file
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <a className="btn-secondary" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="shelf-addresses-template.csv" style={{ textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Download size={14} /> Template
        </a>
      </div>
      <textarea className="input-field" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Or paste here:\naddress,name,shop_floor\nFLOOR-C1-1,Silk sarees,yes'} style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13 }} aria-label="CSV text" />

      {(parsed.problem || preview.isPending || result || preview.error) && (
        <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: 14, display: 'grid', gap: 8 }} aria-live="polite">
          {parsed.problem ? <span style={{ color: 'var(--accent-danger)' }}>{parsed.problem}</span>
            : preview.isPending ? <span className="sh-muted"><Loader2 size={14} className="animate-spin" /> Checking {parsed.rows.length} rows…</span>
            : preview.error ? <span style={{ color: 'var(--accent-danger)' }}>{preview.error.message}</span>
            : result && (<>
              <strong>{result.create} new {result.create === 1 ? 'spot' : 'spots'}{result.alreadyThere ? ` · ${result.alreadyThere} already there` : ''}{result.errors.length ? ` · ${result.errors.length} ${result.errors.length === 1 ? 'row needs' : 'rows need'} fixing` : ''}</strong>
              {result.areas?.length > 0 && <span className="sh-muted">New areas: {result.areas.join(' · ')}</span>}
              {result.errors.map(e => <span key={e.row} style={{ color: 'var(--accent-danger)', fontSize: 13 }}>Row {e.row}: {e.message}</span>)}
              {result.addresses?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.addresses.map(a => <span key={a} className="sh-chip sh-addr">{a}</span>)}
                  {result.more > 0 && <span className="sh-muted">and {result.more} more</span>}
                </div>
              )}
            </>)}
        </div>
      )}

      <div className="sh-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!result || result.errors.length > 0 || result.create === 0 || save.isPending || preview.isPending || !!parsed.problem}
          onClick={() => save.mutate({ locationId, rows: parsed.rows }, { onSuccess: (r) => { if (r.saved) onClose(); } })}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {save.isPending && <Loader2 size={16} className="animate-spin" />} Import {result?.create || ''}
        </button>
      </div>
    </div>
  );
}
