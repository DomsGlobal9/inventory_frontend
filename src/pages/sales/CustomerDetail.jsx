import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCustomerDetails } from '../../hooks/useCustomers';
import { ArrowLeft, Mail, Phone, MapPin, Building, FileText, ShoppingBag, Truck, Loader2, X, Undo2 } from 'lucide-react';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { formatINR } from '../../utils/formatUtils';
import toast from 'react-hot-toast';
import Select from '../../components/common/Select';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { data: customer, isLoading, error } = useCustomerDetails(id);

  const [activeTab, setActiveTab] = useState('orders');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnReason, setReturnReason] = useState('');

  /**
   * The reasons a return can be filed under, in the words a shop uses on the left and the
   * values the server stores on the right.
   *
   * This picker did not exist. The notes box was placeholdered "Reason for return..." so the
   * intent was there, but free text cannot be grouped in a report, and the API's own reason
   * field was never sent -- so every return went in as OTHER and "why are things coming
   * back?" had no answer. The server now validates this against its enum and refuses
   * anything else, which is why the values here are the enum and not prettier strings.
   */
  const RETURN_REASONS = [
    { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged on the way to the customer' },
    { value: 'DEFECTIVE', label: 'Faulty or badly made' },
    { value: 'WRONG_ITEM', label: 'We sent the wrong thing' },
    { value: 'SIZE_ISSUE', label: 'Size did not fit' },
    { value: 'CUSTOMER_REJECTED', label: 'Customer changed their mind' },
    { value: 'OTHER', label: 'Something else' }
  ];

  /** How many pieces of a dispatch have not already come back. */
  const returnableCount = (dispatch) =>
    (dispatch?.items || []).reduce(
      (sum, item) => sum + Math.max((item.quantity || 0) - (item.returnedQty || 0), 0),
      0
    );

  const returnMutation = useMutation({
    mutationFn: async ({ salesOrderId, items, notes, reason }) => {
      return api.post('/returns', { salesOrderId, items, notes, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setReturnModalOpen(false);
      setSelectedDispatch(null);
      setReturnNotes('');
      setReturnReason('');
      toast.success('Return raised. Inspect it from the Returns screen when the goods arrive.');
    },
    // There was no onError at all: a refusal closed nothing, said nothing, and left the
    // person pressing a button that appeared to do absolutely nothing.
    onError: (error) => toast.error(error?.message || 'Could not raise the return.')
  });

  const handleCreateReturn = () => {
    if (!selectedDispatch) return;
    const items = selectedDispatch.items
      .filter(item => item.quantity - (item.returnedQty || 0) > 0)
      .map(item => ({
        dispatchItemId: item.id,
        quantity: item.quantity - (item.returnedQty || 0)
      }));
    
    // Was a native alert(): a grey system box that does not look like this app, blocks the
    // page, and reads as a browser error rather than an answer to what was just asked.
    if (items.length === 0) {
      return toast.error(
        `Everything in ${selectedDispatch.dispatchNumber} has already been returned. There is nothing left to send back.`,
        { duration: 6000 }
      );
    }

    if (!returnReason) {
      return toast.error('Say why it is coming back — it is the only way the returns report can tell you anything.');
    }

    returnMutation.mutate({
      salesOrderId: selectedDispatch.salesOrderId,
      items,
      notes: returnNotes,
      reason: returnReason
    });
  };

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customer details...</div>;
  }

  if (error || !customer) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'red' }}>Error loading customer details</div>;
  }

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
            <div className="table-container" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                {activeTab === 'orders' ? 'Sales Orders' : 'Dispatches'}
              </h3>
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
                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>{formatINR(Number(order.total))}</td>
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
              // Derived from the customer's salesOrders -- getCustomerById nests
              // dispatches under each salesOrder specifically so this works.
              (() => {
                const allDispatches = customer.salesOrders?.flatMap(o => (o.dispatches || []).map(d => ({ ...d, orderNumber: o.orderNumber }))) || [];
                
                if (allDispatches.length === 0) {
                  return (
                    <div className="table-container" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                            {can('return:create') && (() => {
                              // A Return button on a dispatch that is already fully back is a
                              // dead end: it opens a modal, takes a note, and refuses on the
                              // last press. Say so on the row instead.
                              const left = returnableCount(dispatch);
                              if (left === 0) {
                                return (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    All returned
                                  </span>
                                );
                              }
                              return (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 12px', fontSize: '12px' }}
                                  title={`${left} ${left === 1 ? 'piece' : 'pieces'} can still come back`}
                                  onClick={() => {
                                    setSelectedDispatch(dispatch);
                                    setReturnModalOpen(true);
                                  }}
                                >
                                  Return
                                </button>
                              );
                            })()}
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
        /* Dressed like ConfirmModal, which is what every other dialog in this app looks
           like. This one was a bare .card at a fixed 500px with maxWidth 90vw and no padding
           on the backdrop, so on a narrow window it ran under both edges of the screen and
           lost the ends of its own sentences. Square corners, no shadow and no header rule
           made it read as a browser dialog rather than part of the product. */
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setReturnModalOpen(false); }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)', borderRadius: '12px',
              width: '100%', maxWidth: '440px', border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column',
              // A short window must not clip the buttons off the bottom of the dialog.
              maxHeight: 'calc(100vh - 32px)', overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
              <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', display: 'flex' }}>
                <Undo2 size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Book in a return</h2>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="btn-icon"
                style={{ position: 'absolute', top: '18px', right: '18px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {(() => {
                const left = returnableCount(selectedDispatch);
                return `${left} ${left === 1 ? 'piece' : 'pieces'} from ${selectedDispatch.dispatchNumber} will be booked in as coming back. Nothing returns to stock until you inspect it.`;
              })()}
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Why is it coming back?</label>
              <Select
                className="input-field"
                style={{ width: '100%' }}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                <option value="">Choose a reason...</option>
                {RETURN_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
            
            <div className="form-group">
              <label>Anything else worth noting? (Optional)</label>
              <textarea 
                className="input-field" 
                rows="3"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. border torn on the left side"
              />
            </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setReturnModalOpen(false)} disabled={returnMutation.isPending}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateReturn}
                disabled={returnMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {returnMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {returnMutation.isPending ? 'Booking in...' : 'Book it in'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
