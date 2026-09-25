import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCustomerDetails } from '../../hooks/useCustomers';
import { ArrowLeft, Mail, Phone, MapPin, Building, FileText, ShoppingBag, Truck, Loader2, X, Undo2, Edit2 } from 'lucide-react';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { formatINR } from '../../utils/formatUtils';
import toast from 'react-hot-toast';
import Select from '../../components/common/Select';
import CustomerGroupsCard from '../../components/CustomerGroupsCard';
import { CustomerOffersCard, CustomerPointsCard } from '../../components/loyalty/CustomerLoyaltyCards';
import StoreCreditCard from '../../components/loyalty/StoreCreditCard';
import CustomerModal from '../../components/sales/CustomerModal';
import { formatPhone } from '../../utils/phone';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { COUNTER_PHONE_QUERY } from '../../hooks/useCounterSale';
import { ORDER_STATUS, DISPATCH_STATUS, CUSTOMER_STATUS, RETURN_REASONS, StatusPill } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';

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
  // How many of each shipped line are coming back. A customer returns the blouse and keeps the
  // saree; sending back every piece of the dispatch was the only choice there used to be.
  const [returnQty, setReturnQty] = useState({});
  const [editing, setEditing] = useState(false);
  const phoneScreen = useMediaQuery(COUNTER_PHONE_QUERY);

  /*
   * The reasons a return can be filed under (components/sales/labels, shared with the Returns
   * screens so a reason reads the same where it is chosen and where it is read back).
   *
   * This picker did not exist. The notes box was placeholdered "Reason for return..." so the
   * intent was there, but free text cannot be grouped in a report, and the API's own reason
   * field was never sent -- so every return went in as OTHER and "why are things coming
   * back?" had no answer. The server validates the value against its enum.
   */

  /** How many of one shipped line can still come back: not returned, and not on a return still open. */
  const lineReturnable = (item) =>
    Math.max((item.quantity || 0) - (item.returnedQty || 0) - (item.openReturnQty || 0), 0);

  /** How many pieces of a dispatch have not already come back. */
  const returnableCount = (dispatch) =>
    (dispatch?.items || []).reduce((sum, item) => sum + lineReturnable(item), 0);

  const lineLabel = (item, index) => {
    const v = item.salesOrderItem?.variant;
    if (!v) return `Item ${index + 1}`;
    return [v.product?.title, v.colorName, v.size].filter(Boolean).join(', ') + (v.sku ? ` (${v.sku})` : '');
  };

  const returnMutation = useMutation({
    mutationFn: async ({ salesOrderId, items, notes, reason }) => {
      return api.post('/returns', { salesOrderId, items, notes, reason });
    },
    onSuccess: () => {
      // ['customers', id] is the key useCustomerDetails reads; ['customer', id] matched nothing, so a
      // raised return did not show on this page until it was reloaded.
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setReturnModalOpen(false);
      setSelectedDispatch(null);
      setReturnNotes('');
      setReturnReason('');
      setReturnQty({});
      toast.success('Return raised. Inspect it from the Returns screen when the goods arrive.');
    },
    // There was no onError at all: a refusal closed nothing, said nothing, and left the
    // person pressing a button that appeared to do absolutely nothing.
    onError: (error) => toast.error(error?.message || 'Could not raise the return.')
  });

  const handleCreateReturn = () => {
    if (!selectedDispatch) return;
    if (returnableCount(selectedDispatch) === 0) {
      return toast.error(
        `Everything in ${selectedDispatch.dispatchNumber} has already been returned or is on an open return. There is nothing left to send back.`,
        { duration: 6000 }
      );
    }

    const items = selectedDispatch.items
      .map(item => ({ dispatchItemId: item.id, quantity: Math.min(Number(returnQty[item.id] || 0), lineReturnable(item)) }))
      .filter(item => item.quantity > 0);

    if (items.length === 0) {
      return toast.error('Choose how many of each item are coming back.');
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/customers')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>{customer.name}</h1>
            <StatusPill map={CUSTOMER_STATUS} value={customer.status} />
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>{customer.customerCode}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {can('sales_order:counter_sale') && !phoneScreen && (
            <button className="btn-primary" onClick={() => navigate(`/orders/new-sale?customer=${customer.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={15} /> New sale
            </button>
          )}
          {can('customer:update') && (
            <button className="btn-secondary" onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={15} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>

        {/* Left Sidebar: CRM Details. minWidth 0 so a long email cannot widen the column past a phone. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span style={{ overflowWrap: 'anywhere' }}>{customer.email || 'No email provided'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <Phone size={16} />
                {customer.phone
                  ? <span>{formatPhone(customer.phone)}</span>
                  : (
                    <span style={{ color: 'var(--accent-warning, #f59e0b)' }}>
                      No phone yet{can('customer:update') && <> — <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>add one</button></>}
                    </span>
                  )}
              </div>
            </div>
          </div>

          <CustomerGroupsCard customer={customer} canEdit={can('customer:update')} />

          <CustomerPointsCard customerId={customer.id} />
          <StoreCreditCard customerId={customer.id} />
          <CustomerOffersCard customer={customer} />

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
                {/* A plain text column. JSON.stringify printed it wrapped in quote marks. */}
                {customer.billingAddress || customer.shippingAddress || 'No address on file'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Tabs / Orders. minWidth 0, or the orders table sizes the whole grid to its own width. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '32px' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{ padding: '12px 0', border: 'none', background: 'transparent', borderBottom: activeTab === 'orders' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: '500', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <ShoppingBag size={18} /> Sales Orders
            </button>
            <button
              onClick={() => setActiveTab('dispatches')}
              style={{ padding: '12px 0', border: 'none', background: 'transparent', borderBottom: activeTab === 'dispatches' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === 'dispatches' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: '500', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
                    <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER #</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DATE</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                      <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>TOTAL</th>
                      <th style={{ padding: '12px 24px', width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.salesOrders.map(order => (
                      <tr
                        key={order.id}
                        style={{ borderBottom: '1px solid var(--border-light)' }}
                        {...rowLink(() => navigate(`/orders/${order.id}`), { label: `Open ${order.orderNumber}` })}
                      >
                        <td style={{ padding: '16px 24px', fontWeight: '500' }}>{order.orderNumber}</td>
                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <StatusPill map={ORDER_STATUS} value={order.status} />
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
                      <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DISPATCH #</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER #</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>DATE</th>
                        <th style={{ padding: '12px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                        <th style={{ padding: '12px 24px', width: '60px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDispatches.map(dispatch => (
                        <tr key={dispatch.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '16px 24px', fontWeight: '500' }}>{dispatch.dispatchNumber}</td>
                          <td style={{ padding: '16px 24px' }}>{dispatch.orderNumber}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{new Date(dispatch.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 24px' }}>
                            <StatusPill map={DISPATCH_STATUS} value={dispatch.status} />
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
                                    setReturnQty({});
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
        createPortal(<div
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
                const chosen = selectedDispatch.items.reduce((n, i) => n + Math.min(Number(returnQty[i.id] || 0), lineReturnable(i)), 0);
                return `${chosen} ${chosen === 1 ? 'piece' : 'pieces'} from ${selectedDispatch.dispatchNumber} will be booked in as coming back. Nothing returns to stock until you inspect it.`;
              })()}
            </p>

            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <label style={{ margin: 0 }}>What is coming back?</label>
                <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => setReturnQty(Object.fromEntries(selectedDispatch.items.map(i => [i.id, lineReturnable(i)])))}>
                  All of it
                </button>
              </div>
              {selectedDispatch.items.map((item, index) => {
                const max = lineReturnable(item);
                const value = Number(returnQty[item.id] || 0);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid var(--border-light)', borderRadius: '8px', opacity: max === 0 ? 0.55 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', overflowWrap: 'anywhere' }}>{lineLabel(item, index)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {max === 0 ? 'Nothing left to return' : `${max} of ${item.quantity} can come back`}
                        {item.openReturnQty > 0 ? ` · ${item.openReturnQty} already on an open return` : ''}
                      </div>
                    </div>
                    <button type="button" className="btn-icon" aria-label={`One less of ${lineLabel(item, index)}`} disabled={value <= 0}
                      onClick={() => setReturnQty(q => ({ ...q, [item.id]: Math.max(0, value - 1) }))}>−</button>
                    <span aria-label="Quantity coming back" style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{value}</span>
                    <button type="button" className="btn-icon" aria-label={`One more of ${lineLabel(item, index)}`} disabled={value >= max}
                      onClick={() => setReturnQty(q => ({ ...q, [item.id]: Math.min(max, value + 1) }))}>+</button>
                  </div>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Why is it coming back?</label>
              <Select
                className="input-field"
                aria-label="Why is it coming back?"
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
        </div>, document.body)
      )}

      <CustomerModal isOpen={editing} onClose={() => setEditing(false)} customer={customer} />
    </div>
  );
}
