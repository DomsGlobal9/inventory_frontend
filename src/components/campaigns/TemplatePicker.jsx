import React, { useState } from 'react';
import { X, FileText, Trash2, Loader2, Image as ImageIcon, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCampaignTemplates, useDeleteTemplate } from '../../hooks/useCampaigns';
import ConfirmModal from '../ConfirmModal';

/**
 * Before a new campaign: start blank, or from a template -- the shop's own (words, picture and link
 * saved earlier) or one of ScaleEzy's four starters. Who it goes to is chosen fresh every time.
 */
export default function TemplatePicker({ onPick, onClose, canDelete }) {
  const templates = useCampaignTemplates();
  const del = useDeleteTemplate();
  const [doomed, setDoomed] = useState(null);
  const rows = templates.data ?? [];
  const own = rows.filter(t => !t.starter);
  const starters = rows.filter(t => t.starter);

  const Row = ({ t }) => (
    <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px 12px' }}>
      {t.media
        ? <img src={t.media.url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
        : <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={18} style={{ opacity: 0.5 }} /></div>}
      <button type="button" onClick={() => onPick(t)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {t.name}
          {t.media && <ImageIcon size={13} aria-label="with a picture" style={{ opacity: 0.6 }} />}
          {t.link && <Link2 size={13} aria-label="with a link" style={{ opacity: 0.6 }} />}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'pre-wrap' }}>{t.text}</div>
      </button>
      {!t.starter && canDelete && (
        <button type="button" className="btn-icon" aria-label={`Delete the template ${t.name}`} onClick={() => setDoomed(t)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Trash2 size={16} /></button>
      )}
    </li>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="tpl-title" style={{ width: '560px', maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="tpl-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>New campaign</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '16px 24px 24px', overflowY: 'auto', display: 'grid', gap: '16px' }}>
          <button type="button" className="btn-primary" onClick={() => onPick(null)} style={{ justifySelf: 'start' }}>Start blank</button>
          {templates.isLoading ? <Loader2 size={18} className="animate-spin" /> : templates.error ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--danger, #dc2626)' }}>{templates.error.message}</p>
          ) : (
            <>
              {own.length > 0 && (
                <section>
                  <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Your templates</h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>{own.map(t => <Row key={t.id} t={t} />)}</ul>
                </section>
              )}
              <section>
                <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Starters</h4>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>{starters.map(t => <Row key={t.id} t={t} />)}</ul>
              </section>
            </>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={!!doomed}
        onClose={() => setDoomed(null)}
        title={`Delete the template "${doomed?.name ?? ''}"?`}
        message="Campaigns already made from it are not changed."
        confirmText="Delete template"
        confirmStyle="danger"
        onConfirm={async () => {
          try { await del.mutateAsync(doomed.id); toast.success('Template deleted.'); setDoomed(null); }
          catch (e) { toast.error(e?.message || 'The template could not be deleted.'); }
        }}
      />
    </div>
  );
}
