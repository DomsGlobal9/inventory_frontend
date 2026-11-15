import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { useReelLinks, useAddToReelLink } from '../../hooks/useReelLinks';

/**
 * From the Products list: the ticked pieces go into a new reel link, or after the pieces of an existing one.
 * Only published pieces can go in (a shopper could not see the others), so the caller passes those.
 */
export default function AddToReelDialog({ isOpen, onClose, productIds, onDone }) {
  const navigate = useNavigate();
  const titleId = useId();
  const list = useReelLinks({ enabled: isOpen });
  const add = useAddToReelLink();
  const [choice, setChoice] = useState('NEW');
  useEffect(() => { if (isOpen) setChoice('NEW'); }, [isOpen]);
  const ref = useDialog(isOpen, { onClose, canClose: !add.isPending });
  if (!isOpen) return null;

  const existing = (list.data ?? []).filter(r => r.active);
  const go = async () => {
    try {
      const made = await add.mutateAsync({ productIds, reelLinkId: choice === 'NEW' ? null : choice });
      toast.success(choice === 'NEW' ? 'Reel link made' : 'Added to the reel link');
      onDone?.();
      onClose();
      navigate(`/reel-links/${made.id}`);
    } catch (e) { toast.error(e?.message || 'The pieces could not be added.'); }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !add.isPending) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        style={{ background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: 440, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Add {productIds.length} {productIds.length === 1 ? 'piece' : 'pieces'} to a reel link</h2>
          <button type="button" className="btn-icon" aria-label="Close" onClick={onClose} disabled={add.isPending}><X size={18} /></button>
        </div>
        <div style={{ padding: '8px 20px', overflowY: 'auto' }} role="radiogroup" aria-labelledby={titleId}>
          <label className="rl-dialog-opt" style={optStyle}>
            <input type="radio" name="reel" checked={choice === 'NEW'} onChange={() => setChoice('NEW')} style={radioStyle} />
            <div><b>New reel link</b><div style={subStyle}>Starts with these pieces. You can change the title next.</div></div>
          </label>
          {list.isLoading && <p style={subStyle}>Loading your reel links…</p>}
          {existing.map(r => (
            <label key={r.id} className="rl-dialog-opt" style={optStyle}>
              <input type="radio" name="reel" checked={choice === r.id} onChange={() => setChoice(r.id)} style={radioStyle} />
              <div><b>{r.title}</b><div style={subStyle}>{r.pieces} {r.pieces === 1 ? 'piece' : 'pieces'}</div></div>
            </label>
          ))}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={add.isPending}>Cancel</button>
          <button type="button" className="btn-primary" onClick={go} disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const optStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 2px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-primary)' };
const radioStyle = { marginTop: 3, width: 18, height: 18, accentColor: 'var(--brand-solid)', flex: 'none' };
const subStyle = { color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 };
