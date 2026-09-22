import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { api } from '../../lib/api';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { RETURN_STATUS, StatusPill, returnReasonLabel } from '../../components/sales/labels';

import PageLoader from '../../components/PageLoader';

export default function ReturnsList() {
  const { can } = usePermission();
  const navigate = useNavigate();
  // A card per return on a phone, like Orders. The six-column table was 681px wide in a 390px
  // screen, so STATUS -- the thing the guide says to look for -- was off the edge.
  const narrow = useMediaQuery('(max-width: 760px)');

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      return api.get('/returns');
    }
  });

  if (isLoading) {
    return <PageLoader text="LOADING RETURNS..." />;
  }

  const returns = returnsData?.data || [];
  const th = { padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Customer Returns</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Take back what customers bring to the counter, and check returned parcels.</p>
        </div>
        {(can('return:counter') || (can('return:create') && can('return:complete'))) && (
          <button className="btn-primary" onClick={() => navigate('/returns/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <Undo2 size={17} /> Take a return
          </button>
        )}
      </div>

      {narrow ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {returns.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>No returns found.</div>
          ) : returns.map(ret => (
            <button key={ret.id} type="button" onClick={() => navigate(`/returns/${ret.id}`)}
              style={{ textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, color: 'var(--text-primary)', display: 'grid', gap: 6, cursor: 'pointer', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{ret.returnNumber}</span>
                <StatusPill map={RETURN_STATUS} value={ret.status} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                {[ret.salesOrder?.orderNumber && `Order ${ret.salesOrder.orderNumber}`, ret.salesOrder?.customer?.name, new Date(ret.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{returnReasonLabel(ret.reason)}</div>
            </button>
          ))}
        </div>
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-hover)' }}>
                <th style={th}>RETURN #</th>
                <th style={th}>ORDER #</th>
                <th style={th}>CUSTOMER</th>
                <th style={th}>DATE</th>
                <th style={th}>STATUS</th>
                <th style={th}>REASON</th>
              </tr>
            </thead>
            <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No returns found.
                </td>
              </tr>
            ) : (
              returns.map(ret => (
                <tr
                  key={ret.id}
                  style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                  onClick={() => navigate(`/returns/${ret.id}`)}
                  className="table-row-hover"
                >
                  <td style={{ padding: '16px 24px', fontWeight: 500 }}>{ret.returnNumber}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{ret.salesOrder?.orderNumber}</td>
                  <td style={{ padding: '16px 24px' }}>{ret.salesOrder?.customer?.name}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                    {new Date(ret.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <StatusPill map={RETURN_STATUS} value={ret.status} />
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {returnReasonLabel(ret.reason)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  );
}
