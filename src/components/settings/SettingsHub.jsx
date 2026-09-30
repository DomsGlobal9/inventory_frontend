import React from 'react';
import { Store, Users, Grid, Globe, IndianRupee, MessageCircle, Key, LifeBuoy, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../hooks/useBranding';
import { holdsEverything } from '../../lib/authority';

/**
 * The front page of Settings: who you are, then every setting sorted into a handful of cards,
 * each a list of places to go (the shape Razorpay's account page uses). Fourteen sections in one
 * long sidebar had become a scroll-and-guess; seven cards with named links inside can be read at
 * a glance.
 *
 * A link opens its section full-width, and `part` is the id of the element inside it to scroll to
 * -- so "Banners" lands ON the banners, not at the top of Online shop. For the catalogue, `part`
 * is the tab to open instead.
 *
 * Every link carries the permission of the section it opens; the same rule the sidebar used, so
 * nobody is offered a door that opens onto a refusal. A card with nothing left in it is not shown.
 */
export const GROUPS = [
  { id: 'SHOP', label: 'Your shop', icon: Store, links: [
    { label: 'Name, logo and bill details', section: 'GENERAL', part: 'gi-shop-title', ownerOnly: true },
    { label: 'Stock locations', section: 'LOCATIONS' }
  ] },
  { id: 'TEAM', label: 'Team and access', icon: Users, links: [
    { label: 'Team members', section: 'USERS' },
    { label: 'Roles and permissions', section: 'ROLES' }
  ] },
  { id: 'CATALOG', label: 'Catalogue', icon: Grid, links: [
    { label: 'Sizes', section: 'CATALOG', part: 'SIZE' },
    { label: 'Colours', section: 'CATALOG', part: 'COLOR' },
    { label: 'Dress types', section: 'CATALOG', part: 'DRESS_TYPE' },
    { label: 'Materials', section: 'CATALOG', part: 'MATERIAL' },
    { label: 'Design types', section: 'CATALOG', part: 'DESIGN_TYPE' },
    { label: 'Categories', section: 'CATALOG', part: 'CATEGORY' },
    { label: 'Product types', section: 'CATALOG', part: 'PRODUCT_TYPE' }
  ] },
  { id: 'ONLINE', label: 'Selling online', icon: Globe, links: [
    { label: 'Online shop', section: 'ONLINE_SHOP' },
    { label: 'Orders and delivery', section: 'ONLINE_SHOP', part: 'os-orders' },
    { label: 'Banners', section: 'ONLINE_SHOP', part: 'os-banners' },
    { label: 'Share your shop', section: 'ONLINE_SHOP', part: 'os-share' },
    { label: 'Connected websites', section: 'STOREFRONT' }
  ] },
  { id: 'MONEY', label: 'Money', icon: IndianRupee, links: [
    { label: 'Razorpay account', section: 'PAYMENTS' },
    { label: 'Online payments and refunds', section: 'PAYMENTS', part: 'pay-activity' },
    { label: 'Returns and exchanges', section: 'RETURNS' },
    { label: 'Day Book', section: 'DAYBOOK' },
    { label: 'POS (billing counter)', section: 'POS' }
  ] },
  { id: 'CUSTOMERS', label: 'Customers', icon: MessageCircle, links: [
    { label: 'WhatsApp', section: 'WHATSAPP' },
    { label: 'Loyalty points', section: 'LOYALTY' },
    { label: 'Birthday and anniversary wishes', section: 'LOYALTY', part: 'l-bday' }
  ] },
  { id: 'DEV', label: 'Developers', icon: Key, links: [
    { label: 'APIs and services', section: 'SERVICES' }
  ] }
];

/** The card a section belongs to, for the breadcrumb above an open section. */
export const groupOf = (sectionId) => GROUPS.find(g => g.links.some(l => l.section === sectionId)) ?? null;

const prettyRole = (role) => String(role).toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const CSS = `
  .hub-profile { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; overflow: hidden; }
  .hub-who { background: color-mix(in srgb, var(--brand) 16%, var(--bg-card)); padding: 22px; display: flex; gap: 14px; align-items: flex-start; }
  .hub-avatar { width: 72px; height: 72px; border-radius: 14px; background: #fff; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; color: var(--brand-ink); flex-shrink: 0; overflow: hidden; }
  /* The whole logo, never a crop of it: "contain", with a little air, on white so any logo reads. */
  .hub-avatar img { width: 100%; height: 100%; object-fit: contain; padding: 5px; box-sizing: border-box; }
  .hub-k { font-size: 12px; color: var(--text-secondary); }
  .hub-v { font-size: 14px; color: var(--text-primary); display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
  .hub-facts { padding: 20px 24px; display: grid; grid-template-columns: 130px minmax(0, 1fr); row-gap: 12px; column-gap: 12px; align-items: center; align-content: start; }
  .hub-link { background: none; border: none; padding: 0; font: inherit; font-size: 13px; color: var(--brand-ink); cursor: pointer; text-decoration: none; text-align: left; }
  .hub-link:hover { color: var(--text-primary); }
  .hub-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
  .hub-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 18px 20px; }
  .hub-card h3 { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
  .hub-ic { width: 32px; height: 32px; border-radius: 50%; background: color-mix(in srgb, var(--brand) 28%, var(--bg-card)); color: var(--brand-ink); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .hub-card ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
  .hub-card li .hub-link { font-size: 14px; font-weight: 600; }
  .hub-eyebrow { font-size: 13px; color: var(--text-secondary); margin: 0 0 10px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .hub-help { position: fixed; right: 24px; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); z-index: 40; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--border-light); background: var(--brand-deep); color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.18); }
  .hub-help:hover { filter: brightness(1.08); }
  @media (max-width: 720px) {
    .hub-help { right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
    .hub-profile { grid-template-columns: 1fr; }
    .hub-facts { grid-template-columns: 1fr; row-gap: 4px; }
    .hub-facts .hub-k { margin-top: 8px; }
  }
`;

/**
 * `open(section, part)` shows a section; `canOpen(section)` is Settings' own permission check for
 * it, so the cards and the sections can never disagree about who may see what.
 */
export default function SettingsHub({ open, canOpen }) {
  const { user } = useAuth();
  const { data: branding } = useBranding();
  const isOwner = holdsEverything(user);
  const roles = user?.roles ?? [];
  const roleWord = isOwner ? 'Owner' : roles.length ? roles.map(prettyRole).join(', ') : 'Team member';

  const allowed = (link) => canOpen(link.section) && (!link.ownerOnly || isOwner);
  const cards = GROUPS.map(g => ({ ...g, links: g.links.filter(allowed) })).filter(g => g.links.length);

  const copyId = async () => {
    try { await navigator.clipboard.writeText(user.clientId); toast.success('Shop ID copied.'); }
    catch { toast.error('Could not copy. Select it and copy by hand.'); }
  };

  return (
    <div>
      <style>{CSS}</style>

      <p className="hub-eyebrow">Your profile</p>
      <section className="hub-profile" aria-label="Your profile">
        <div className="hub-who">
          <div className="hub-avatar" aria-hidden="true">
            {branding?.logoUrl ? <img src={branding.logoUrl} alt="" /> : initials(user?.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{user?.name || 'Unknown user'}</div>
            <div className="hub-k">{roleWord}</div>
            <div style={{ marginTop: '6px' }}>
              <button type="button" className="hub-link" onClick={() => open('GENERAL', 'gi-account-title')}>Edit profile</button>
            </div>
            {branding?.businessName && (
              <>
                <div className="hub-k" style={{ marginTop: '14px' }}>Shop</div>
                <div className="hub-v" style={{ fontWeight: 600 }}>{branding.businessName}</div>
              </>
            )}
            {user?.clientId && (
              <>
                <div className="hub-k" style={{ marginTop: '10px' }}>Shop ID</div>
                <div className="hub-v">
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px' }}>{user.clientId}</span>
                  <button type="button" className="btn-icon" aria-label="Copy the shop ID" onClick={copyId} style={{ padding: '2px' }}><Copy size={13} /></button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hub-facts">
          <span className="hub-k">Login email</span>
          <span className="hub-v" style={{ overflow: 'hidden' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'No email on this account'}</span></span>

          <span className="hub-k">Password</span>
          <span className="hub-v">
            <span aria-hidden="true">••••••••••</span>
            {isOwner
              ? <button type="button" className="hub-link" onClick={() => open('GENERAL', 'gi-password-title')}>Change</button>
              : <span className="hub-k">set by whoever manages your team</span>}
          </span>

          <span className="hub-k">Signed in elsewhere?</span>
          <span className="hub-v">
            <button type="button" className="hub-link" onClick={() => open('GENERAL', 'gi-devices-title')}>Sign out of other devices</button>
          </span>
        </div>
      </section>

      <p className="hub-eyebrow" style={{ marginTop: '28px' }}>Shop settings</p>
      {/* Floats in the corner, so it is there wherever the page has been scrolled to. */}
      <button type="button" className="hub-help" onClick={() => open('SUPPORT')}>
        <LifeBuoy size={16} /> Help and support
      </button>
      <div className="hub-cards">
        {cards.map(g => {
          const Icon = g.icon;
          return (
            <section key={g.id} className="hub-card" aria-labelledby={`hub-${g.id}`}>
              <h3 id={`hub-${g.id}`}><span className="hub-ic"><Icon size={16} /></span>{g.label}</h3>
              <ul>
                {g.links.map(l => (
                  <li key={l.label}>
                    <button type="button" className="hub-link" onClick={() => open(l.section, l.part)}>{l.label}</button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
