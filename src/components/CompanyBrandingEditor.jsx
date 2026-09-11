import React, { useRef, useState } from 'react';
import { Loader2, Upload, Trash2, Save, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBranding, useSetBusinessName, useUploadLogo, useRemoveLogo } from '../hooks/useBranding';
import { isImageFile } from '../utils/imageFile';
import ConfirmModal from './ConfirmModal';

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * The shop's name and logo, for the account owner.
 *
 * Rendered only for the owner -- the backend enforces that independently, so this is about
 * not showing somebody a control that would refuse them, not about security.
 *
 * The name is here rather than on a settings screen of its own because it is the same fact
 * as the logo: what this business is called and what it looks like. Before this existed the
 * name was nowhere -- the client_settings table was empty for every shop on the platform,
 * so purchase orders sent on WhatsApp signed off with whoever happened to be logged in.
 */
export default function CompanyBrandingEditor() {
  const { data: branding } = useBranding();
  const setName = useSetBusinessName();
  const uploadLogo = useUploadLogo();
  const removeLogo = useRemoveLogo();

  const fileRef = useRef(null);
  const [name, setNameValue] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // null means "not edited yet", so the field follows the saved value until somebody types.
  const nameValue = name ?? (branding?.businessName || '');
  const nameChanged = nameValue.trim() !== (branding?.businessName || '');

  const accept = (file) => {
    if (!file) return;
    // isImageFile rather than file.type: a picture chosen on a phone can arrive with no type
    // at all, and rejecting it here is the bug that helper exists to avoid.
    if (!isImageFile(file)) {
      toast.error('That file is not an image. Choose a PNG, JPG or SVG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That image is larger than 2MB. Use a smaller one.');
      return;
    }
    uploadLogo.mutate(file);
  };

  const busy = uploadLogo.isPending || removeLogo.isPending;

  return (
    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Building2 size={16} color="var(--accent-gold)" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Shop name and logo</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Shown to everyone on your team. Only you can change these.
      </p>

      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Shop name
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="e.g. Sri Parvathi Handlooms"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 0 }}
        />
        <button
          className="btn-secondary"
          disabled={!nameChanged || setName.isPending}
          onClick={() => setName.mutate(nameValue.trim())}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: nameChanged ? 1 : 0.5 }}
        >
          {setName.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </div>

      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Logo
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files?.[0]); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          padding: '16px', borderRadius: '12px',
          border: dragOver ? '2px solid var(--accent-gold)' : '1px dashed var(--border-focus)',
          background: dragOver ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-input)'
        }}
      >
        <div style={{
          width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          {branding?.logoUrl
            ? <img src={branding.logoUrl} alt="Shop logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Building2 size={24} color="var(--text-muted)" />}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {uploadLogo.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {branding?.logoUrl ? 'Change logo' : 'Add logo'}
          </button>

          {branding?.logoUrl && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)' }}
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, flexBasis: '100%' }}>
          A square image works best. PNG, JPG or SVG, up to 2MB. You can also drop a file here.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>

      <ConfirmModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={async () => { await removeLogo.mutateAsync(); }}
        title="Remove the logo?"
        message="Your team will see the shop's initial instead. You can add a logo again at any time."
        confirmText="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}
