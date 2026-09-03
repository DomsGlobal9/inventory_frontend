import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAdminClients } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

export default function InventoryHealthPage() {
  const { data, isLoading } = useAdminClients();
  const navigate = useNavigate();

  const sorted = [...(data || [])].sort((a, b) => b.activeAlertCount - a.activeAlertCount);

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Inventory Health</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Stock value and active alerts per client, worst-first.</p>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : (
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Client', 'Active Products', 'Inventory Value', 'Active Alerts', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr
                  key={c.clientId}
                  onClick={() => navigate(`/platformconsole/clients/${c.clientId}`)}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{c.clientId}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{c.activeProductCount}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>₹{Number(c.inventoryValue).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {c.activeAlertCount > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> {c.activeAlertCount}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent-success)' }}>Healthy</span>
                    )}
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PageGuide title="About Inventory Health">
        <p>This tab provides a global view of inventory metrics across all boutiques.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Identify Issues:</strong> Spot which clients have the most active inventory alerts (e.g., low stock, out of stock).</li>
          <li><strong>Value Tracking:</strong> See the total capital value tied up in inventory for each client.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
