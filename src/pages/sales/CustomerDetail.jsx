import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCustomerDetails } from '../../hooks/useCustomers';
import { useCreateSalesOrder } from '../../hooks/useSalesOrders';
import { ArrowLeft, Mail, Phone, MapPin, Building, FileText, ShoppingBag, Truck, Loader2, X } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: customer, isLoading, error } = useCustomerDetails(id);
  const createOrderMutation = useCreateSalesOrder();
  
  const [activeTab, setActiveTab] = useState('orders');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');

  const returnMutation = useMutation({
    mutationFn: async ({ salesOrderId, items, notes }) => {
      const res = await fetch('/api/v1/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesOrderId, items, notes })
      });
      if (!res.ok) throw new Error('Failed to create return');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id]);
      setReturnModalOpen(false);
      setSelectedDispatch(null);
      setReturnNotes('');
    }
  });

  const handleCreateReturn = () => {
    if (!selectedDispatch) return;
    const items = selectedDispatch.items
      .filter(item => item.quantity - (item.returnedQty || 0) > 0)
      .map(item => ({
        dispatchItemId: item.id,
        quantity: item.quantity - (item.returnedQty || 0)
      }));
    
    if (items.length === 0) return alert('No available items to return');

    returnMutation.mutate({
      salesOrderId: selectedDispatch.salesOrderId,
      items,
      notes: returnNotes
    });
  };

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customer details...</div>;
  }

  if (error || !customer) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'red' }}>Error loading customer details</div>;
  }

  const handleCreateOrder = () => {
    createOrderMutation.mutate({ customerId: id }, {
      onSuccess: (newOrder) => {
        navigate(`/orders/${newOrder.id}`);
      }
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/customers')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>{customer.name}</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' }}>
              {customer.status}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>{customer.customerCode}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
        
        {/* Left Sidebar: CRM Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <Mail size={16} />
                <span>{customer.email || 'No email provided'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <Phone size={16} />
                <span>{customer.phone || 'No phone provided'}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Company Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <Building size={16} />
                <span>{customer.companyName || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <FileText size={16} />
                <span>GST: {customer.gstNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Address</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'var(--text-secondary)' }}>
              <MapPin size={16} style={{ marginTop: '2px' }} />
              <div>
                {/* Normally we'd format billingAddress JSON here */}
                {customer.billingAddress ? JSON.stringify(customer.billingAddress) : 'No address on file'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Tabs / Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '32px' }}>
            <button 
              onClick={() => setActiveTab('orders')}
              style={{ padding: '12px 0', border: 'none', background: 'transparent', borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: '500', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <ShoppingBag size={18} /> Sales Orders
            </button>
            <button 
              onClick={() => setActiveTab('dispatches')}
              style={{ padding: '12px 0', border: 'none', background: 'transparent', borderBottom: activeTab === 'dispatches' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'dispatches' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: '500', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Truck size={18} /> Dispatches
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {activeTab === 'orders' ? 'Recent Orders' : 'Recent Dispatches'}
              </h3>
              {activeTab === 'orders' && (
                <button 
                  className="btn-primary" 
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {createOrderMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Create Order
                </button>
              )}
            </div>
            
            {activeTab === 'orders' && (
              customer.salesOrders && customer.salesOrders.length > 0 ? (
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-hover)' }}>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER #</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DATE</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>TOTAL</th>
                      <th style={{ padding: '12px 24px', width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.salesOrders.map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '500' }}>{order.orderNumber}</td>
                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', 
                            backgroundColor: order.status === 'CONFIRMED' || order.status === 'DISPATCHED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', 
                            color: order.status === 'CONFIRMED' || order.status === 'DISPATCHED' ? 'rgb(16, 185, 129)' : 'rgb(107, 114, 128)' 
                          }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>${Number(order.total).toFixed(2)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button 
                            className="btn-secondary"
                            onClick={() => navigate(`/orders/${order.id}`)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                 </table>
              ) : (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No sales orders found for this customer.
                </div>
              )
            )}

            {activeTab === 'dispatches' && (
              // For dispatches, we extract them from the customer's salesOrders since the customer API includes them
              // Or if not included, we just display a coming soon message or fetch them.
              // Let's assume customer.salesOrders[i].dispatches exists.
              (() => {
                const allDispatches = customer.salesOrders?.flatMap(o => (o.dispatches || []).map(d => ({ ...d, orderNumber: o.orderNumber }))) || [];
                
                if (allDispatches.length === 0) {
                  return (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No dispatches found for this customer.
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)' }}>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DISPATCH #</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER #</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DATE</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDispatches.map(dispatch => (
                        <tr key={dispatch.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '16px 24px', fontWeight: '500' }}>{dispatch.dispatchNumber}</td>
                          <td style={{ padding: '16px 24px' }}>{dispatch.orderNumber}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{new Date(dispatch.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' 
                            }}>
                              {dispatch.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button 
                              className="btn-secondary"
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                              onClick={() => {
                                setSelectedDispatch(dispatch);
                                setReturnModalOpen(true);
                              }}
                            >
                              Return
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}

          </div>
        </div>

      </div>

      {returnModalOpen && selectedDispatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Initiate Return</h2>
              <button onClick={() => setReturnModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              This will create a return request for all available items in dispatch {selectedDispatch.dispatchNumber}.
            </p>
            
            <div className="form-group">
              <label>Return Notes (Optional)</label>
              <textarea 
                className="input-field" 
                rows="3"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Reason for return..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setReturnModalOpen(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleCreateReturn}
                disabled={returnMutation.isPending}
              >
                Create Return Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
