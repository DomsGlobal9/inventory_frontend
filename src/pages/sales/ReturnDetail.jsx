import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, AlertTriangle, Box, Truck, Edit3 } from 'lucide-react';

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState({});

  const { data: returnData, isLoading } = useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/returns/${id}`);
      if (!res.ok) throw new Error('Failed to fetch return details');
      return res.json();
    }
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/returns/${id}/receive`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to receive return');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(['return', id])
  });

  const inspectMutation = useMutation({
    mutationFn: async (dispositions) => {
      const res = await fetch(`/api/v1/returns/${id}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsDisposition: dispositions })
      });
      if (!res.ok) throw new Error('Failed to inspect return');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['return', id]);
      setInspectModalOpen(false);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/returns/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete return');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(['return', id])
  });

  if (isLoading) return <div style={{ padding: '24px' }}>Loading...</div>;

  const ret = returnData?.data;
  if (!ret) return <div style={{ padding: '24px' }}>Return not found.</div>;

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

  const getDispositionBadge = (disp) => {
    switch(disp) {
      case 'RESTOCK': return <span style={{ color: 'var(--success-color)' }}>Restock</span>;
      case 'DAMAGED': return <span style={{ color: 'var(--danger-color)' }}>Damaged</span>;
      case 'SCRAP': return <span style={{ color: 'var(--text-secondary)' }}>Scrap</span>;
      default: return <span style={{ color: 'var(--warning-color)' }}>Pending Inspection</span>;
    }
  };

  const handleInspectSubmit = () => {
    const dispositions = Object.keys(inspectionData).map(itemId => ({
      salesReturnItemId: itemId,
      disposition: inspectionData[itemId]
    }));
    inspectMutation.mutate(dispositions);
  };

  const canComplete = ret.status === 'INSPECTED' && ret.items.every(item => item.disposition !== 'PENDING');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <button 
        onClick={() => navigate('/returns')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Returns
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', margin: 0 }}>{ret.returnNumber}</h1>
            <span style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: `${getStatusColor(ret.status)}15`,
              color: getStatusColor(ret.status)
            }}>
              {ret.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Order {ret.salesOrder.orderNumber} • Customer: {ret.salesOrder.customer.name}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {ret.status === 'REQUESTED' && (
            <button 
              className="btn-primary"
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending}
            >
              <Truck size={16} style={{ marginRight: '8px' }} />
              Mark as Received
            </button>
          )}
          
          {(ret.status === 'RECEIVED' || ret.status === 'INSPECTED') && (
            <button 
              className="btn-secondary"
              onClick={() => {
                const initialData = {};
                ret.items.forEach(i => initialData[i.id] = i.disposition);
                setInspectionData(initialData);
                setInspectModalOpen(true);
              }}
            >
              <Edit3 size={16} style={{ marginRight: '8px' }} />
              Inspect Items
            </button>
          )}

          {ret.status === 'INSPECTED' && (
            <button 
              className="btn-primary"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || !canComplete}
              title={!canComplete ? "All items must be inspected first" : ""}
            >
              <CheckCircle size={16} style={{ marginRight: '8px' }} />
              Complete Return
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Returned Items</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'var(--surface-color)' }}>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Product</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {ret.items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.dispatchItem.salesOrderItem.variant.product.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          SKU: {item.dispatchItem.salesOrderItem.variant.sku}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>{item.quantity}</td>
                  <td style={{ padding: '16px 20px' }}>{getDispositionBadge(item.disposition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Return Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason</div>
                <div style={{ fontWeight: 500 }}>{ret.reason.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Created Date</div>
                <div style={{ fontWeight: 500 }}>{new Date(ret.createdAt).toLocaleString()}</div>
              </div>
              {ret.completedAt && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Completed Date</div>
                  <div style={{ fontWeight: 500 }}>{new Date(ret.completedAt).toLocaleString()}</div>
                </div>
              )}
              {ret.notes && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{ret.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {inspectModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Inspect Items</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Select the disposition for each returned item.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {ret.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.dispatchItem.salesOrderItem.variant.sku}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Qty: {item.quantity}</div>
                  </div>
                  <select 
                    className="input-field" 
                    style={{ width: '150px' }}
                    value={inspectionData[item.id] || 'PENDING'}
                    onChange={(e) => setInspectionData({ ...inspectionData, [item.id]: e.target.value })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="RESTOCK">Restock (Add to Inventory)</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAP">Scrap</option>
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setInspectModalOpen(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleInspectSubmit}
                disabled={inspectMutation.isPending}
              >
                Save Dispositions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
