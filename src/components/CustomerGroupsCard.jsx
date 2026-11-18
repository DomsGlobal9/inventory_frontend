import React from 'react';
import { useCrm } from '../hooks/useCrm';

/**
 * The groups a customer is in -- VIP, STAFF, WHOLESALE. Read only.
 *
 * Offers for a group still reach everyone in it, at the till and online, so the groups are shown here.
 * Since 18 Nov 2026 they are made and changed only in ScaleEzy CRM (the owner: "customer grps also should
 * in crm only"); CRM keeps Inventory's copy up to date. With CRM on, the card opens the customer in CRM.
 */
export default function CustomerGroupsCard({ customer }) {
  const crm = useCrm();
  const tags = customer.tags ?? [];
  const inCrm = crm.customerUrl(customer.id);
  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Groups</h3>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>Offers for a group reach everyone in it.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.length === 0 && <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>In no groups</span>}
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '2px 10px', borderRadius: '999px', background: 'var(--bg-input)', fontSize: '13px' }}>{t}</span>
        ))}
      </div>
      <p style={{ margin: '14px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {inCrm ? 'Groups are made and changed in ScaleEzy CRM.' : 'Groups are made and changed in ScaleEzy CRM. To change them, ask ScaleEzy to switch CRM on for your shop.'}
      </p>
      {inCrm && (
        <a href={inCrm} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', padding: '6px 12px' }}>
          Change groups in CRM
        </a>
      )}
    </div>
  );
}
