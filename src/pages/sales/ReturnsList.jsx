import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ReturnsList() {
  const navigate = useNavigate();

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      return api.get('/returns');
    }
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'REQUESTED': return 'var(--warning-color)';
      case 'RECEIVED': return 'var(--info-color)';
      case 'INSPECTED': return 'var(--primary-color)';
      case 'COMPLETED': return 'var(--success-color)';
      case 'REJECTED': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}>Loading returns...</div>;

  const returns = returnsData?.data || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Customer Returns</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage return requests and warehouse inspections.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--surface-hover)' }}>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>RETURN #</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER #</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>CUSTOMER</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DATE</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>REASON</th>
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
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
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
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: `${getStatusColor(ret.status)}15`,
                      color: getStatusColor(ret.status)
                    }}>
                      {ret.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {ret.reason.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
