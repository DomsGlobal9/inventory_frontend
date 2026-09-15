import React, { useRef, useState } from 'react';
import { Loader2, Upload, Trash2, Save, Building2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBranding, useSetBusinessName, useUploadLogo, useRemoveLogo, useSetBrandingDetails } from '../hooks/useBranding';
import { isImageFile } from '../utils/imageFile';
import ConfirmModal from './ConfirmModal';

const MAX_BYTES = 2 * 1024 * 1024;

const FIELDS = [
  { key: 'businessAddress', label: 'Address', placeholder: 'e.g. 12-4-56, Main Bazaar, Vijayawada, Andhra Pradesh 520001', multiline: true },
  { key: 'businessPhone', label: 'Phone', placeholder: 'e.g. +91 98765 43210', type: 'tel', autoComplete: 'tel' },
  { key: 'businessEmail', label: 'Email', placeholder: 'e.g. orders@yourshop.in', type: 'email', autoComplete: 'email' },
  { key: 'gstNumber', label: 'GSTIN', placeholder: 'e.g. 37ABCDE1234F1Z5' }
];

/**
 * The shop's name, logo and letterhead, for the account owner. Laid out by GeneralInfoPanel's
 * stylesheet (the gi-* classes).
 *
 * Rendered only for the owner -- the backend enforces that independently, so this is about not
 * showing somebody a control that would refuse them, not about security.
 *
 * The name and the letterhead details are one form with one Save, and a preview beside them draws
 * the unsaved values: a letterhead is read as one block, and before this the only way to see it was
 * to print a purchase order. The logo is the exception and saves the moment a file is chosen,
 * because an upload cannot sensibly wait in a draft.
 */
export default function CompanyBrandingEditor() {
  const { data: branding } = useBranding();
  const setName = useSetBusinessName();
  const saveDetails = useSetBrandingDetails();
  const uploadLogo = useUploadLogo();
  const removeLogo = useRemoveLogo();

  const fileRef = useRef(null);
  // null means "not edited yet", so each follows the saved value until somebody types.
  const [nameDraft, setNameDraft] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const savedName = branding?.businessName || '';
  const nameValue = nameDraft ?? savedName;
  const nameChanged = nameValue.trim() !== savedName;

  const saved = Object.fromEntries(FIELDS.map(f => [f.key, branding?.[f.key] || '']));
  const values = draft ?? saved;
  const detailsChanged = FIELDS.some(f => (values[f.key] || '').trim() !== saved[f.key]);

  const dirty = nameChanged || detailsChanged;
  const saving = setName.isPending || saveDetails.isPending;
  const logoBusy = uploadLogo.isPending || removeLogo.isPending;

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

  // Each part is cleared only once its own save succeeds, so a refused GSTIN leaves the typed
  // details on screen to correct rather than throwing them away along with a name that did save.
  const submit = async (e) => {
    e.preventDefault();
    if (!dirty || saving) return;
    try {
      if (nameChanged) {
        await setName.mutateAsync(nameValue.trim());
        setNameDraft(null);
      }
      if (detailsChanged) {
        await saveDetails.mutateAsync(Object.fromEntries(FIELDS.map(f => [f.key, (values[f.key] || '').trim() || null])));
        setDraft(null);
      }
    } catch {
      // Toasted by the hooks.
    }
  };

  const discard = () => { setNameDraft(null); setDraft(null); };

  const field = (f) => {
    const id = `letterhead-${f.key}`;
    return (
      <div key={f.key} style={{ minWidth: 0 }}>
        <label className="gi-label" htmlFor={id}>{f.label}</label>
        {f.multiline ? (
          <textarea
            id={id}
            className="input-field"
            rows={2}
            maxLength={300}
            autoComplete="street-address"
            placeholder={f.placeholder}
            value={values[f.key]}
            onChange={(e) => setDraft({ ...values, [f.key]: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        ) : (
          <input
            id={id}
            className="input-field"
            type={f.type || 'text'}
            autoComplete={f.autoComplete || 'off'}
            maxLength={f.key === 'gstNumber' ? 15 : 120}
            placeholder={f.placeholder}
            value={values[f.key]}
            onChange={(e) => setDraft({ ...values, [f.key]: f.key === 'gstNumber' ? e.target.value.toUpperCase() : e.target.value })}
            style={{ width: '100%' }}
          />
        )}
      </div>
    );
  };

  const byKey = Object.fromEntries(FIELDS.map(f => [f.key, f]));

  return (
    <section className="gi-card" aria-labelledby="gi-shop-title">
      <div className="gi-head">
        <div className="gi-head-icon"><Building2 size={18} /></div>
        <div>
          <h2 id="gi-shop-title">Shop details</h2>
          <p>Your shop's name, logo and letterhead. Your team sees them; only you can change them.</p>
        </div>
      </div>

      <form className="gi-brand" onSubmit={submit}>
        <div className="gi-brand-form">
          <div>
            <label className="gi-label" htmlFor="letterhead-businessName">Shop name</label>
            <input
              id="letterhead-businessName"
              type="text"
              className="input-field"
              autoComplete="organization"
              maxLength={120}
              placeholder="e.g. Sri Parvathi Handlooms"
              value={nameValue}
              onChange={(e) => setNameDraft(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <span className="gi-label">Logo</span>
            <div
              className={`gi-drop${dragOver ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files?.[0]); }}
            >
              <div className="gi-logo">
                {uploadLogo.isPending
                  ? <Loader2 size={20} className="animate-spin" color="var(--text-muted)" />
                  : branding?.logoUrl
                    ? <img src={branding.logoUrl} alt="Shop logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <Building2 size={24} color="var(--text-muted)" />}
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="gi-drop-buttons">
                  <button type="button" className="btn-secondary gi-btn" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
                    <Upload size={14} /> {branding?.logoUrl ? 'Change' : 'Add logo'}
                  </button>
                  {branding?.logoUrl && (
                    <button type="button" className="btn-secondary gi-btn" disabled={logoBusy} onClick={() => setConfirmRemove(true)} style={{ color: 'var(--accent-danger)' }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
                <p className="gi-hint" style={{ margin: 0 }}>Square works best. PNG, JPG or SVG up to 2MB, or drop a file here. Saved as soon as you choose it.</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className="gi-eyebrow" style={{ marginBottom: '2px' }}>Letterhead</div>
              <p className="gi-hint" style={{ margin: 0 }}>Printed under your name on purchase orders and goods receipts. Leave any empty to leave it off.</p>
            </div>
            {field(byKey.businessAddress)}
            <div className="gi-pair">
              {field(byKey.businessPhone)}
              {field(byKey.businessEmail)}
            </div>
            <div className="gi-pair">
              {field(byKey.gstNumber)}
            </div>
          </div>
        </div>

        <div className="gi-brand-preview">
          <LetterheadPreview
            shop={{ businessName: nameValue.trim(), ...Object.fromEntries(FIELDS.map(f => [f.key, (values[f.key] || '').trim()])) }}
            logoUrl={branding?.logoUrl}
          />
        </div>

        <div className="gi-brand-actions">
          {dirty && (
            <button type="button" className="btn-secondary gi-btn" onClick={discard} disabled={saving}>
              <RotateCcw size={14} /> Discard
            </button>
          )}
          {/* Outline while there is nothing to save, so a filled button only ever means "press me". */}
          <button type="submit" className={`${dirty ? 'btn-primary' : 'btn-secondary'} gi-btn`} disabled={!dirty || saving} style={{ opacity: dirty ? 1 : 0.6 }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={async () => { await removeLogo.mutateAsync(); }}
        title="Remove the logo?"
        message="Your team will see the shop's initial instead. You can add a logo again at any time."
        confirmText="Remove"
        confirmStyle="danger"
      />
    </section>
  );
}

// The PDF letterhead's own colours (components/pdf/Letterhead.jsx), repeated rather than imported:
// importing that file would pull the PDF renderer into the Settings screen. White in both themes,
// because it is a picture of paper.
const INK = '#1f2328';
const MUTED = '#6b7280';
const ACCENT = '#b8860b';

/** A small drawing of the top of a purchase order, from the values being typed. */
function LetterheadPreview({ shop, logoUrl }) {
  const contact = [shop.businessPhone, shop.businessEmail].filter(Boolean).join('  ·  ');
  const line = { fontSize: '10.5px', color: MUTED, lineHeight: 1.45, overflowWrap: 'anywhere' };
  const bar = (width) => <div style={{ height: '6px', width, borderRadius: '3px', background: '#eceef1' }} />;

  return (
    <div>
      <div className="gi-eyebrow" style={{ marginBottom: '8px' }}>Preview</div>
      <div
        aria-label="Letterhead preview"
        style={{ background: '#ffffff', color: INK, borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 24px -8px rgba(0,0,0,0.18)', padding: '18px 18px 14px', fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: `2px solid ${ACCENT}` }}>
          <div style={{ display: 'flex', gap: '10px', minWidth: 0, flex: '1 1 180px' }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', flexShrink: 0 }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px', overflowWrap: 'anywhere', color: shop.businessName ? INK : MUTED }}>
                {shop.businessName || 'Your shop'}
              </div>
              {shop.businessAddress && <div style={line}>{shop.businessAddress}</div>}
              {contact && <div style={line}>{contact}</div>}
              {shop.gstNumber && <div style={line}>GSTIN: {shop.gstNumber}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flex: '0 0 auto', marginLeft: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>PURCHASE ORDER</div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: ACCENT }}>PO-000123</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', margin: '14px 0' }}>
          <div style={{ flex: 1, background: '#f8f8f6', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>{bar('40%')}{bar('75%')}{bar('60%')}</div>
          <div style={{ flex: 1, background: '#f8f8f6', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>{bar('35%')}{bar('70%')}{bar('55%')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingTop: '8px', borderTop: `1px solid ${INK}` }}>
          {bar('92%')}{bar('84%')}{bar('88%')}
        </div>

        <div style={{ marginTop: '16px', paddingTop: '6px', borderTop: '1px solid #e5e7eb', fontSize: '8.5px', color: MUTED, textAlign: 'center' }}>
          Generated with <strong style={{ color: ACCENT }}>ScaleEzy</strong>
        </div>
      </div>
      <p className="gi-hint">How the top of your purchase orders and goods receipts will look. Blank lines are left off.</p>
    </div>
  );
}
