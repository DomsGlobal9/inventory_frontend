import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, FolderOpen, Images, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Search, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';
import { putImageBytes, registerImage } from '../services/image.service';

/**
 * Photos for many products at once (29 Oct).
 *
 * A folder of photos named by SKU or product code -- KS-104.jpg, or KS-104-green-2.jpg for the second
 * photo of the green one. The server says which product each name is (names only, nothing is sent
 * yet), the person sees that list and fixes what did not match, and only then does anything upload:
 * straight from this browser to storage, three at a time, the same upload the product page uses.
 * A colour's photo goes up once and is recorded against every size of that colour.
 *
 * Opened after a sheet import too, with the sheet's photo links: those are fetched by the server,
 * one by one, each with its own result.
 *
 * Products arrive as drafts, so the last step offers to publish the ones that now have a photo.
 */

const MAX_FILES = 1000;
const MAX_BYTES = 15 * 1024 * 1024;
const AT_ONCE = 3;
/** System files a folder carries that nobody means as photos. */
const JUNK = /^(\.|thumbs\.db$|desktop\.ini$)/i;

async function filesFromDrop(dt) {
  const entries = [...(dt.items || [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...(dt.files || [])];
  const out = [];
  const walk = async (entry) => {
    if (entry.isFile) { out.push(await new Promise((res, rej) => entry.file(res, rej))); return; }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walk(e);
    }
  };
  for (const e of entries) await walk(e);
  return out;
}

/** Runs `work` over `items`, `n` at a time. */
async function pool(items, n, work) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; await work(items[i], i); }
  }));
}

const where = (m) => m.colour ? `${m.colour}${m.position ? `, photo ${m.position}` : ''}` : (m.position ? `photo ${m.position}` : 'whole piece');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Searching for the product a photo is of, when its name matched nothing. */
function PickProduct({ onPick, onCancel }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [chosen, setChosen] = useState(null);
  useEffect(() => {
    if (q.trim().length < 2) { setFound(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      api.get('/product-photos/find', { params: { q: q.trim() } })
        .then(r => { if (alive) setFound(r.data || []); })
        .catch(() => { if (alive) setFound([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  if (chosen) {
    return (
      <div className="bp-pick">
        <div className="bp-pick-head">Which colour is in this photo? <button className="bp-link" onClick={() => setChosen(null)}>Change product</button></div>
        <div className="bp-chips">
          <button className="bp-chip" onClick={() => onPick(chosen, null, [])}>Whole piece</button>
          {chosen.colours.map(c => (
            <button key={c.colour} className="bp-chip" onClick={() => onPick(chosen, c.colour, c.variantIds)}>{c.colour}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="bp-pick">
      <label className="bp-search">
        <Search size={14} aria-hidden="true" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Product name, code or SKU" aria-label="Find the product" />
      </label>
      {found && !found.length && <div className="bp-muted">Nothing by that name.</div>}
      {found?.map(p => (
        <button key={p.id} className="bp-result" onClick={() => p.colours.length ? setChosen(p) : onPick(p, null, [])}>
          <b>{p.title}</b><span>{p.productCode}</span>
        </button>
      ))}
      <button className="bp-link" onClick={onCancel}>Cancel</button>
    </div>
  );
}

export default function BulkPhotosModal({ isOpen, onClose, onDone, photoLinks = [] }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([]);          // one per chosen file
  const [without, setWithout] = useState([]);    // drafts with no photo and nothing here for them
  const [phase, setPhase] = useState('choose');  // choose | reading | review | uploading | done
  const [picking, setPicking] = useState(null);  // row index being matched by hand
  const [links, setLinks] = useState([]);        // the sheet's photo links, one job each
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [batch, setBatch] = useState(0);         // a new choice of photos, for the thumbnails
  const folderRef = useRef(null), filesRef = useRef(null);
  const ran = useRef(false);

  // The sheet's links start at once: the person already chose them, in the sheet.
  useEffect(() => {
    if (!isOpen || ran.current || !photoLinks.length) return;
    ran.current = true;
    const jobs = photoLinks.flatMap(s => s.urls.map((url, i) => ({ productId: s.productId, colour: s.colour, url, position: i + 1, status: 'waiting' })));
    setLinks(jobs);
    (async () => {
      await pool(jobs, 2, async (job, i) => {
        setLinks(l => l.map((j, k) => k === i ? { ...j, status: 'working' } : j));
        try {
          const r = await api.post('/product-photos/from-link', { productId: job.productId, colour: job.colour, url: job.url, position: job.position });
          const d = r.data;
          setLinks(l => l.map((j, k) => k === i ? { ...j, status: d.already ? 'already' : 'done', productTitle: d.productTitle, productStatus: d.productStatus } : j));
        } catch (e) {
          setLinks(l => l.map((j, k) => k === i ? { ...j, status: 'failed', error: e?.message || 'That photo could not be added.' } : j));
        }
      });
    })();
  }, [isOpen, photoLinks]);

  // Thumbnails, released when the list changes or the window closes.
  const previews = useMemo(() => rows.map(r => r.file.type.startsWith('image/') && r.file.size < MAX_BYTES ? URL.createObjectURL(r.file) : null), [batch]); // made again for each new choice of photos, not on every status change
  useEffect(() => () => previews.forEach(u => u && URL.revokeObjectURL(u)), [previews]);

  if (!isOpen) return null;

  const busy = phase === 'reading' || phase === 'uploading' || publishing || links.some(j => j.status === 'waiting' || j.status === 'working');
  const close = () => {
    if (busy) return;
    setRows([]); setWithout([]); setPhase('choose'); setLinks([]); ran.current = false;
    onClose();
  };

  const accept = async (list) => {
    const files = [...list].filter(f => !JUNK.test(f.name));
    if (!files.length) { toast.error('There are no photos in that.'); return; }
    if (files.length > MAX_FILES) { toast.error(`That is ${files.length} files. Add up to ${MAX_FILES} at a time.`); return; }
    setPhase('reading');
    try {
      const r = await api.post('/product-photos/match', { names: files.map(f => f.name) });
      const { files: matched, withoutPhotos } = r.data;
      setRows(files.map((file, i) => {
        const m = matched[i];
        const tooBig = file.size > MAX_BYTES;
        return {
          file, match: m,
          // Already added (same file name on that product) is left out unless ticked back in.
          include: m.status === 'MATCHED' && !tooBig && !m.already,
          problem: tooBig ? `Bigger than 15 MB (${(file.size / 1048576).toFixed(1)} MB). Make it smaller and add it again.` : (m.status !== 'MATCHED' ? m.reason : null),
          status: 'waiting'
        };
      }));
      setWithout(withoutPhotos || []);
      setBatch(b => b + 1);
      setPhase('review');
    } catch (e) {
      toast.error(e?.message || 'Those photos could not be checked. Try again.');
      setPhase('choose');
    }
  };

  const setRow = (i, patch) => setRows(rs => rs.map((r, k) => k === i ? { ...r, ...patch } : r));

  const pick = (i, product, colour, variantIds) => {
    setRow(i, {
      match: { ...rows[i].match, status: 'MATCHED', productId: product.id, productTitle: product.title, productCode: product.productCode, productStatus: product.status, colour, variantIds, position: null, hasPhotos: product.hasPhotos, already: false, byHand: true },
      include: rows[i].file.size <= MAX_BYTES, problem: rows[i].file.size > MAX_BYTES ? rows[i].problem : null
    });
    setPicking(null);
  };

  const chosen = rows.filter(r => r.include);

  const upload = async (only) => {
    setPhase('uploading');
    // Which photo leads each set (the piece, or a colour): the one numbered 1, then one named for the
    // product before one matched by hand, then by name. It becomes the main photo only when the product
    // has none at all.
    const order = new Map();
    rows.forEach((r, i) => {
      if (!r.include) return;
      const k = `${r.match.productId}|${r.match.colour ?? ''}`;
      order.set(k, [...(order.get(k) ?? []), i]);
    });
    const rank = new Map();
    for (const idxs of order.values()) {
      idxs.sort((a, b) => (rows[a].match.position ?? 99) - (rows[b].match.position ?? 99)
        || Number(!!rows[a].match.byHand) - Number(!!rows[b].match.byHand)
        || rows[a].file.name.localeCompare(rows[b].file.name));
      idxs.forEach((idx, n) => rank.set(idx, n));
    }
    const todo = rows.map((r, i) => i).filter(i => rows[i].include && (only ? only.includes(i) : rows[i].status !== 'done'));
    await pool(todo, AT_ONCE, async (i) => {
      const r = rows[i], m = r.match;
      setRow(i, { status: 'uploading', error: null });
      try {
        const stored = await putImageBytes(m.productId, r.file);
        const n = m.position ? m.position - 1 : rank.get(i);
        const targets = m.variantIds?.length ? m.variantIds : [undefined];
        for (const variantId of targets) {
          await registerImage(m.productId, stored, { variantId, orderIndex: n, isPrimary: !m.hasPhotos && rank.get(i) === 0 });
        }
        setRow(i, { status: 'done' });
      } catch (e) {
        setRow(i, { status: 'failed', error: e?.message || 'Could not upload. Check the connection and try again.' });
      }
    });
    invalidateDerivedViews(queryClient);
    setPhase('done');
  };

  // Drafts that now have at least one photo: the ones it makes sense to put on sale.
  const readyDrafts = (() => {
    const ids = new Map();
    for (const r of rows) if (r.status === 'done' && r.match.productStatus === 'DRAFT') ids.set(r.match.productId, r.match.productTitle);
    for (const j of links) if ((j.status === 'done' || j.status === 'already') && j.productStatus === 'DRAFT') ids.set(j.productId, j.productTitle);
    return [...ids.keys()];
  })();

  const publish = async () => {
    setPublishing(true);
    let changed = 0; const failed = [];
    try {
      for (let i = 0; i < readyDrafts.length; i += 200) {
        const r = await api.post('/products/bulk-status', { ids: readyDrafts.slice(i, i + 200), status: 'ACTIVE' });
        changed += r.data.changed; failed.push(...(r.data.failed || []));
      }
      if (failed.length) toast.error(`${plural(changed, 'product')} published. ${failed.length} could not be: ${failed[0].title ? `${failed[0].title}, ` : ''}${failed[0].reason}`);
      else toast.success(`${plural(changed, 'product')} published`);
      setRows(rs => rs.map(r => readyDrafts.includes(r.match.productId) ? { ...r, match: { ...r.match, productStatus: 'ACTIVE' } } : r));
      setLinks(l => l.map(j => readyDrafts.includes(j.productId) ? { ...j, productStatus: 'ACTIVE' } : j));
      invalidateDerivedViews(queryClient);
      onDone?.();
    } catch (e) {
      toast.error(e?.message || 'They could not be published just now. Try again.');
    } finally {
      setPublishing(false);
    }
  };

  const counts = {
    matched: rows.filter(r => r.match.status === 'MATCHED' && !r.problem).length,
    products: new Set(rows.filter(r => r.include).map(r => r.match.productId)).size,
    unmatched: rows.filter(r => r.match.status === 'UNMATCHED').length,
    notPhotos: rows.filter(r => r.match.status === 'NOT_A_PHOTO' || (r.problem && r.match.status === 'MATCHED')).length,
    already: rows.filter(r => r.match.already).length,
    done: rows.filter(r => r.status === 'done').length,
    failed: rows.filter(r => r.status === 'failed').length,
    linksDone: links.filter(j => j.status === 'done' || j.status === 'already').length,
    linksFailed: links.filter(j => j.status === 'failed').length,
    linksLeft: links.filter(j => j.status === 'waiting' || j.status === 'working').length
  };

  return createPortal(<>
    <div onClick={close} className="bp-veil" />
    <div className="bp" role="dialog" aria-modal="true" aria-labelledby="bp-title">
      <div className="bp-head">
        <div>
          <h2 id="bp-title">Add photos</h2>
          <p>Name each photo by its SKU or product code, like <b>KS-104.jpg</b>. For more than one, add the colour and a number: <b>KS-104-green-2.jpg</b>.</p>
        </div>
        <button className="btn-icon" onClick={close} disabled={busy} title="Close" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="bp-body">
        {links.length > 0 && (
          <section className="bp-links">
            <div className="bp-links-head">
              <Link2 size={15} aria-hidden="true" />
              <b>Photos from your sheet</b>
              <span>{counts.linksLeft ? `Adding ${links.length - counts.linksLeft} of ${links.length}…` : `${counts.linksDone} added${counts.linksFailed ? `, ${counts.linksFailed} could not be` : ''}`}</span>
            </div>
            <div className="bp-bar"><i style={{ transform: `scaleX(${(links.length - counts.linksLeft) / links.length})` }} /></div>
            {links.filter(j => j.status === 'failed').slice(0, 20).map((j, k) => (
              <div key={k} className="bp-linkfail"><span title={j.url}>{j.url.replace(/^https?:\/\//, '').slice(0, 48)}</span>{j.error}</div>
            ))}
          </section>
        )}

        {(phase === 'choose' || phase === 'reading') && (
          <div
            className={`bp-drop${dragOver ? ' over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => { e.preventDefault(); setDragOver(false); if (phase !== 'reading') accept(await filesFromDrop(e.dataTransfer)); }}
          >
            {phase === 'reading' ? <Loader2 size={28} className="animate-spin" /> : <Images size={28} aria-hidden="true" />}
            <div className="bp-drop-title">{phase === 'reading' ? 'Matching your photos…' : 'Drop a folder of photos here'}</div>
            <div className="bp-drop-actions">
              <button className="btn-primary" disabled={phase === 'reading'} onClick={() => folderRef.current?.click()}><FolderOpen size={15} /> Choose a folder</button>
              <button className="btn-secondary" disabled={phase === 'reading'} onClick={() => filesRef.current?.click()}><Images size={15} /> Choose photos</button>
            </div>
            <div className="bp-muted">JPG, PNG or WebP, up to 15 MB each, up to {MAX_FILES} at a time. Nothing uploads until you have checked the list.</div>
            <input ref={folderRef} type="file" multiple webkitdirectory="" directory="" style={{ display: 'none' }} onChange={(e) => { accept(e.target.files || []); e.target.value = ''; }} />
            <input ref={filesRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.heic,.heif" style={{ display: 'none' }} onChange={(e) => { accept(e.target.files || []); e.target.value = ''; }} />
          </div>
        )}

        {phase !== 'choose' && phase !== 'reading' && (
          <>
            <div className="bp-summary">
              {phase === 'review' && <>
                <span className="ok">{plural(counts.matched, 'photo')} for {plural(new Set(rows.filter(r => r.match.status === 'MATCHED').map(r => r.match.productId)).size, 'product')}</span>
                {counts.unmatched > 0 && <span className="warn">{counts.unmatched} need a product</span>}
                {counts.notPhotos > 0 && <span className="bad">{counts.notPhotos} cannot be used</span>}
                {counts.already > 0 && <span>{counts.already} already added</span>}
              </>}
              {phase !== 'review' && <>
                <span className="ok">{counts.done} of {chosen.length} uploaded</span>
                {counts.failed > 0 && <span className="bad">{counts.failed} failed</span>}
              </>}
            </div>
            {phase === 'uploading' && <div className="bp-bar"><i style={{ transform: `scaleX(${chosen.length ? (counts.done + counts.failed) / chosen.length : 0})` }} /></div>}

            <ul className="bp-list">
              {rows.map((r, i) => (
                <li key={i} className={`bp-row s-${r.status}${r.include ? '' : ' off'}`}>
                  <span className="bp-thumb">{previews[i] ? <img src={previews[i]} alt="" loading="lazy" /> : null}</span>
                  <div className="bp-what">
                    <div className="bp-name" title={r.file.name}>{r.file.name}</div>
                    {r.match.status === 'MATCHED' && !r.problem
                      ? <div className="bp-to"><b>{r.match.productTitle}</b> <span>{r.match.productCode} · {where(r.match)}</span></div>
                      : <div className="bp-problem">{r.problem || r.match.reason}</div>}
                    {r.match.already && phase === 'review' && <div className="bp-muted">This product already has a photo with this name.</div>}
                    {r.status === 'failed' && <div className="bp-problem">{r.error}</div>}
                    {picking === i && <PickProduct onPick={(p, c, v) => pick(i, p, c, v)} onCancel={() => setPicking(null)} />}
                  </div>
                  <div className="bp-act">
                    {phase === 'review' && r.match.status === 'UNMATCHED' && picking !== i && <button className="btn-secondary bp-small" onClick={() => setPicking(i)}>Pick product</button>}
                    {phase === 'review' && r.match.status === 'MATCHED' && !r.problem && (
                      <label className="bp-tick"><input type="checkbox" checked={r.include} onChange={e => setRow(i, { include: e.target.checked })} /> Add</label>
                    )}
                    {r.status === 'uploading' && <Loader2 size={16} className="animate-spin" aria-label="Uploading" />}
                    {r.status === 'done' && <CheckCircle2 size={16} color="var(--accent-success)" aria-label="Uploaded" />}
                    {r.status === 'failed' && phase === 'done' && <button className="btn-secondary bp-small" onClick={() => upload([i])}><RotateCcw size={13} /> Try again</button>}
                  </div>
                </li>
              ))}
            </ul>

            {phase === 'review' && without.length > 0 && (
              <details className="bp-without">
                <summary>{plural(without.length, 'draft')} still without a photo</summary>
                <ul>{without.slice(0, 50).map(p => <li key={p.id}>{p.title} <span>{p.productCode}</span></li>)}</ul>
                {without.length > 50 && <div className="bp-muted">…and {without.length - 50} more. Drafts only filter on Products lists them all.</div>}
              </details>
            )}
          </>
        )}
      </div>

      <div className="bp-foot">
        {phase === 'review' && <button className="btn-secondary" onClick={() => { setRows([]); setPhase('choose'); }}>Choose other photos</button>}
        {phase === 'review' && (
          <button className="btn-primary" disabled={!chosen.length} onClick={() => upload()}>
            Upload {plural(chosen.length, 'photo')}
          </button>
        )}
        {phase === 'uploading' && <button className="btn-primary" disabled><Loader2 size={15} className="animate-spin" /> Uploading…</button>}
        {(phase === 'done' || (phase === 'choose' && links.length > 0)) && (
          <>
            {counts.failed > 0 && phase === 'done' && <button className="btn-secondary" onClick={() => upload(rows.map((r, i) => i).filter(i => rows[i].status === 'failed'))}><RotateCcw size={14} /> Try the {counts.failed} again</button>}
            {readyDrafts.length > 0 && (
              <button className="btn-primary" disabled={publishing || busy} onClick={publish}>
                {publishing ? <Loader2 size={15} className="animate-spin" /> : null} Publish the {plural(readyDrafts.length, 'draft')} with photos
              </button>
            )}
            <button className="btn-secondary" disabled={busy} onClick={close}>Done</button>
          </>
        )}
        {phase === 'choose' && !links.length && <button className="btn-secondary" onClick={close}>Cancel</button>}
      </div>
    </div>
  </>, document.body);
}
