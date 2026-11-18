import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useCrm } from '../../hooks/useCrm';

/**
 * /campaigns and /campaigns/:id (18 Nov 2026, the owner: "campaigns are a CRM thing").
 *
 * WhatsApp campaigns live in ScaleEzy CRM only. An old bookmark or link lands here, never on an empty page:
 * a shop with CRM gets the way to its Messages there; a shop without CRM is told plainly where campaigns are.
 * Inventory keeps only what loyalty itself sends (Settings, Loyalty and offers).
 */
export default function CampaignsMoved() {
  const crm = useCrm();
  return (
    <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }}>Campaigns are in ScaleEzy CRM</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {crm.on
          ? 'Offers on WhatsApp, festival messages, birthday wishes and win-back messages are made and sent from Messages in CRM.'
          : 'Offers on WhatsApp, festival messages and win-back messages are part of ScaleEzy CRM. To send them, ask ScaleEzy to switch CRM on for your shop.'}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {crm.on ? (
          <a href={crm.messagesUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ExternalLink size={15} /> Open Messages in CRM
          </a>
        ) : null}
        <Link to="/customers" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Back to customers</Link>
      </div>
    </div>
  );
}
