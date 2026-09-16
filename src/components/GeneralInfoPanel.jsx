import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { User as UserIcon, Mail, Shield, Edit2, Save, X, Loader2, Info } from 'lucide-react';
import ChangeOwnPassword from './ChangeOwnPassword';
import SignOutOtherDevices from './SignOutOtherDevices';
import CompanyBrandingEditor from './CompanyBrandingEditor';
import { useBranding } from '../hooks/useBranding';
import { useUpdateMyProfile } from '../hooks/useTeam';
import { useAuth } from '../context/AuthContext';
import { holdsEverything } from '../lib/authority';

/**
 * Settings -> General Info: who is signed in, and -- for the owner -- the shop's identity and their
 * own password.
 *
 * Laid out with container queries rather than media queries. The panel's width depends on the
 * window AND on whether the Settings sidebar is beside it (it is above 768px, and takes 280px), so
 * the window size alone says little about how much room these cards actually have.
 */
export const GENERAL_INFO_CSS = `
  .gi { container-type: inline-size; display: flex; flex-direction: column; gap: 16px; }
  .gi-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 18px; min-width: 0; }
  .gi-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
  .gi-head-icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(226, 193, 113, 0.14); color: var(--accent-gold); }
  .gi-head h2 { font-size: 17px; font-weight: 650; margin: 0 0 2px; color: var(--text-primary); letter-spacing: -0.01em; }
  .gi-head p { font-size: 13px; margin: 0; color: var(--text-secondary); line-height: 1.45; }
  .gi-label { display: block; font-size: 12.5px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
  .gi-hint { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; line-height: 1.45; }
  .gi-eyebrow { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .gi-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }

  /* Account */
  .gi-hero { padding: 0; overflow: hidden; }
  .gi-hero-banner { height: 56px; background: linear-gradient(120deg, rgba(226, 193, 113, 0.28) 0%, rgba(226, 193, 113, 0.06) 60%, transparent 100%); border-bottom: 1px solid var(--border-light); }
  .gi-hero-body { padding: 0 18px 18px; display: grid; grid-template-columns: auto 1fr; grid-template-areas: "avatar action" "info info" "facts facts"; column-gap: 16px; row-gap: 12px; }
  .gi-avatar { grid-area: avatar; width: 72px; height: 72px; margin-top: -36px; border-radius: 50%; padding: 4px; background: var(--bg-card); }
  .gi-avatar > div { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 600; color: var(--accent-gold); border: 1px solid var(--border-light); background: linear-gradient(135deg, var(--bg-input) 0%, var(--bg-dark) 100%); }
  .gi-action { grid-area: action; justify-self: end; align-self: center; margin-top: 10px; }
  .gi-info { grid-area: info; min-width: 0; }
  .gi-name { font-size: 22px; font-weight: 700; margin: 2px 0 0; color: var(--text-primary); letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .gi-facts { grid-area: facts; display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 4px; padding-top: 16px; border-top: 1px solid var(--border-light); }
  .gi-fact { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .gi-fact-value { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); min-width: 0; }
  .gi-fact-value { align-items: flex-start; }
  .gi-fact-value svg { margin-top: 2px; }
  .gi-fact-value span { min-width: 0; overflow-wrap: anywhere; }
  .gi-roles { display: flex; flex-wrap: wrap; gap: 6px; }
  .gi-role { display: inline-flex; align-items: center; gap: 5px; background: rgba(226, 193, 113, 0.1); color: var(--accent-gold); border: 1px solid rgba(226, 193, 113, 0.25); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .gi-edit { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
  .gi-edit-row { display: flex; flex-direction: column; gap: 8px; }
  .gi-edit-row .gi-btn { flex: 1; }
  .gi-note { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border-light); font-size: 13px; color: var(--text-secondary); line-height: 1.45; }

  /* Shop details */
  .gi-brand { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "form" "preview" "actions"; gap: 20px; }
  .gi-brand-form { grid-area: form; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .gi-brand-preview { grid-area: preview; min-width: 0; }
  .gi-brand-actions { grid-area: actions; display: flex; flex-direction: column-reverse; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border-light); }
  .gi-brand-actions .gi-btn { width: 100%; }
  .gi-pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .gi-drop { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 12px; border: 1px dashed var(--border-focus); background: var(--bg-input); }
  .gi-drop.over { border: 2px solid var(--accent-gold); background: rgba(212, 175, 55, 0.08); }
  .gi-logo { width: 64px; height: 64px; border-radius: 12px; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-light); }
  .gi-drop-buttons { display: flex; flex-wrap: wrap; gap: 8px; }

  /* Password */
  .gi-pass-head { display: flex; flex-direction: column; gap: 14px; }
  .gi-pass-head .gi-head { margin-bottom: 0; }
  .gi-pass-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .gi-pass-actions { display: flex; flex-direction: column-reverse; gap: 8px; margin-top: 16px; }
  .gi-pass-actions .gi-btn { width: 100%; }

  @container (min-width: 520px) {
    .gi-card { padding: 24px; }
    .gi-hero { padding: 0; }
    .gi-hero-banner { height: 76px; }
    .gi-hero-body { padding: 0 24px 24px; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "avatar info action" "facts facts facts"; align-items: start; }
    .gi-avatar { width: 96px; height: 96px; margin-top: -48px; }
    .gi-avatar > div { font-size: 36px; }
    .gi-info { padding-top: 12px; }
    .gi-action { align-self: start; margin-top: 12px; }
    /* The email is the long one, so it gets the wider share. */
    .gi-facts { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); }
    .gi-edit-row { flex-direction: row; }
    .gi-edit-row .gi-btn { flex: 0 0 auto; }
    .gi-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gi-brand-actions, .gi-pass-actions { flex-direction: row; justify-content: flex-end; }
    .gi-brand-actions .gi-btn, .gi-pass-actions .gi-btn { width: auto; }
    .gi-pass-head { flex-direction: row; align-items: flex-start; justify-content: space-between; }
    .gi-pass-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  /* The preview goes beside the form once there is room, where it can be read while typing.
     760 rather than wider: beside both sidebars, a 1366-1440px laptop leaves this panel ~800px. */
  @container (min-width: 760px) {
    .gi-card { padding: 28px; }
    .gi-hero { padding: 0; }
    .gi-hero-body { padding: 0 28px 24px; }
    .gi-brand { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-areas: "form preview" "actions preview"; column-gap: 32px; row-gap: 0; }
    .gi-brand-actions { margin-top: 20px; }
    .gi-brand-preview { position: sticky; top: 0; align-self: start; }
  }
`;

const prettyRole = (role) => String(role).toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function GeneralInfoPanel() {
  const { user, refreshUser } = useAuth();
  const { data: branding } = useBranding();
  const updateProfile = useUpdateMyProfile();
  const isOwner = holdsEverything(user);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const startEditing = () => { setName(user?.name || ''); setEditing(true); };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Enter your name.');
      return;
    }
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      // AuthContext still holds the copy read at login; without this the header, the initials
      // and this card kept the old name behind a "Profile updated" toast until a reload.
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      // Toasted by the hook.
    }
  };

  const roles = user?.roles?.length ? user.roles : ['USER'];

  return (
    <div className="gi">
      <style>{GENERAL_INFO_CSS}</style>

      <section className="gi-card gi-hero" aria-labelledby="gi-account-title">
        <div className="gi-hero-banner" />
        <div className="gi-hero-body">
          {/* The shop's logo where the person's initial would be: an account belongs to a
              business, and the initial is only what it falls back to before a logo is set.
              Cropped to the circle; the Shop details card below shows the whole logo. */}
          <div className="gi-avatar">
            <div>
              {branding?.logoUrl
                ? <img src={branding.logoUrl} alt={branding?.businessName || 'Shop logo'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : (user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={28} />)}
            </div>
          </div>

          {!editing && (
            <div className="gi-action">
              <button type="button" className="btn-secondary gi-btn" onClick={startEditing} style={{ padding: '6px 14px', fontSize: '13px' }}>
                <Edit2 size={14} /> Edit profile
              </button>
            </div>
          )}

          <div className="gi-info">
            {editing ? (
              <form className="gi-edit" onSubmit={saveProfile}>
                <div>
                  <label className="gi-label" htmlFor="gi-profile-name">Full name</label>
                  <input
                    id="gi-profile-name"
                    type="text"
                    className="input-field"
                    autoFocus
                    maxLength={80}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="gi-note">
                  <Shield size={16} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    {isOwner
                      ? 'Your name is yours to change. Your role is the owner\'s and cannot be changed here — it is what gets you back in if another role is set up wrongly.'
                      : 'Your name is yours to change. Your role and password are set by whoever manages your team, so ask them if either needs to change.'}
                  </span>
                </div>
                <div className="gi-edit-row">
                  <button type="submit" className="btn-primary gi-btn" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes
                  </button>
                  <button type="button" className="btn-secondary gi-btn" onClick={() => setEditing(false)}>
                    <X size={16} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* The business above the person: whose account this is, then who is on it.
                    Left out, not shown blank, when no shop name is set. */}
                {branding?.businessName && <div className="gi-eyebrow">{branding.businessName}</div>}
                <h2 id="gi-account-title" className="gi-name">{user?.name || 'Unknown user'}</h2>
              </>
            )}
          </div>

          {!editing && (
            <div className="gi-facts">
              <div className="gi-fact">
                <span className="gi-eyebrow">Email</span>
                <div className="gi-fact-value" title={user?.email || ''}>
                  <Mail size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <span>{user?.email || 'No email on this account'}</span>
                </div>
              </div>
              <div className="gi-fact">
                <span className="gi-eyebrow">Access level</span>
                <div className="gi-roles">
                  {roles.map(role => (
                    <span key={role} className="gi-role"><Shield size={12} /> {prettyRole(role)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Only the owner. The backend refuses anyone else, so this is about not offering
          controls that would only say no. */}
      {isOwner ? (
        <>
          <CompanyBrandingEditor />
          <ChangeOwnPassword />
        </>
      ) : (
        <section className="gi-card">
          <div className="gi-head" style={{ marginBottom: 0 }}>
            <div className="gi-head-icon"><Info size={18} /></div>
            <div>
              <h2>Shop details and password</h2>
              <p>
                The shop's name, logo and letterhead are set by the owner. Your password and role are
                set by whoever manages your team — ask them if either needs to change.
              </p>
            </div>
          </div>
        </section>
      )}

      <SignOutOtherDevices />
    </div>
  );
}
