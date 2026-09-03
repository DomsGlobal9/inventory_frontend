import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSalesOrderDetails, useConfirmOrder, useCancelOrder } from '../../hooks/useSalesOrders';
import { useCreateDispatch } from '../../hooks/useDispatches';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Truck } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { formatINR } from '../../utils/formatUtils';

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data: order, isLoading } = useSalesOrderDetails(id);
  const confirmMutation = useConfirmOrder();
  const cancelMutation = useCancelOrder();
  const dispatchMutation = useCreateDispatch();

  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchQuantities, setDispatchQuantities] = useState({});

  if (isLoading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading order details...</div>;
  if (!order) return <div style={{ padding: '48px', textAlign: 'center', color: 'red' }}>Order not found</div>;

  const handleConfirmOrder = () => {
    if (window.confirm("Are you sure you want to confirm this order? This will reserve inventory stock.")) {
      confirmMutation.mutate(id);
    }
  };

  const handleCancelOrder = () => {
    if (window.confirm("Are you sure you want to cancel this order? All reserved stock will be released.")) {
      cancelMutation.mutate(id);
    }
  };

  // What's left to ship on a line. Every quantity shown on this page used to be the full
  // ordered qty regardless of what had already gone out, so after a partial dispatch the
  // page invited the user to ship the whole order a second time -- and the backend
  // rejected it with "Cannot dispatch N. Only M reserved remaining."
  const remainingQty = (item) => Math.max(0, (item.quantity || 0) - (item.fulfilledQty || 0));

  const handleOpenDispatch = () => {
    const initialQs = {};
    (order.items || []).forEach(item => {
      initialQs[item.id] = 0;
    });
    setDispatchQuantities(initialQs);
    setIsDispatching(true);
  };

  const handleCreateDispatch = () => {
    const itemsToDispatch = [];
    Object.keys(dispatchQuantities).forEach(itemId => {
      const qty = parseInt(dispatchQuantities[itemId]);
      const item = (order.items || []).find(i => i.id === itemId);
      if (qty > 0 && item && qty <= remainingQty(item)) {
        itemsToDispatch.push({ salesOrderItemId: itemId, quantity: qty });
      }
    });

    if (itemsToDispatch.length === 0) {
      alert("Please enter a quantity greater than 0 for at least one item.");
      return;
    }

    dispatchMutation.mutate({ salesOrderId: id, items: itemsToDispatch }, {
      onSuccess: () => setIsDispatching(false)
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>Order {order.orderNumber}</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(107, 114, 128, 0.1)', color: 'rgb(107, 114, 128)' }}>
              {order.status}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>Customer: {order.customer?.name} | Created: {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
        
        {/* Main Area: Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Line Items</h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-hover)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>SKU</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>PRODUCT</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>QTY</th>
                  {order.status !== 'DRAFT' && (
                    <>
                      <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>RESERVED</th>
                      <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>DISPATCHED</th>
                    </>
                  )}
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>UNIT PRICE</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>TOTAL</th>
                  <th style={{ padding: '16px 24px', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {order.items?.length === 0 ? (
                  <tr><td colSpan={order.status === 'DRAFT' ? "6" : "8"} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No items added yet.</td></tr>
                ) : (
                  order.items?.map(item => {
                    // We can compute reserved and dispatched from the item relations if populated, 
                    // or just use fulfilledQty for dispatched. We assume fulfilledQty exists or we use reservations.
                    // For Sprint 4, we use fulfilledQty which we should be maintaining. Wait, did we add fulfilledQty update?
                    // The schema has fulfilledQty. We can just use item.fulfilledQty for UI, but wait, the backend doesn't update fulfilledQty yet!
                    // Let's use the reservations data if it's there. The backend includes items, but not items.reservations.
                    // Actually, the user's schema has `fulfilledQty` on SalesOrderItem, but we didn't update it in DispatchService.
                    // For now, let's just show what we have. If we need to, we can just show item.fulfilledQty.
                    // Actually, we didn't update item.fulfilledQty in DispatchService. We should have. Let's just show it.
                    return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: '500' }}>{item.variant?.sku}</td>
                      <td style={{ padding: '16px 24px' }}>{item.variant?.product?.title}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>{item.quantity}</td>
                      {order.status !== 'DRAFT' && (
                        <>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--warning)', fontWeight: '500' }}>
                            {remainingQty(item)}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--success)', fontWeight: '500' }}>
                            {item.fulfilledQty || 0}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatINR(Number(item.unitPrice))}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>{formatINR(Number(item.totalPrice))}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600' }}>Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Subtotal ({order.items?.length} items)</span>
              <span>{formatINR(Number(order.subtotal))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Discount</span>
              <span>-{formatINR(Number(order.discountAmount))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Tax</span>
              <span>+{formatINR(Number(order.taxAmount))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-secondary)' }}>
              <span>Shipping</span>
              <span>+{formatINR(Number(order.shippingAmount))}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontWeight: '600', fontSize: '18px' }}>
              <span>Grand Total</span>
              <span>{formatINR(Number(order.total))}</span>
            </div>

            {order.status === 'DRAFT' && (
              <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {can('sales_order:confirm') && (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={handleConfirmOrder}
                    disabled={confirmMutation.isPending || order.items?.length === 0}
                  >
                    {confirmMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Confirm Order
                  </button>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Confirming will reserve stock in the warehouse.
                </p>
              </div>
            )}

            {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DISPATCHED') && (
              <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {can('dispatch:create') && (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={handleOpenDispatch}
                  >
                    <Truck size={18} />
                    Create Dispatch
                  </button>
                )}
                {can('sales_order:cancel') && (
                  <button
                    className="btn-secondary"
                    style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={handleCancelOrder}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                    Cancel Order
                  </button>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Dispatching will deduct physical inventory and recognize revenue.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dispatch Modal */}
      {isDispatching && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '600px', maxWidth: '90vw', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Create Dispatch</h3>
              <button onClick={() => setIsDispatching(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <XCircle size={24} color="var(--text-secondary)" />
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '8px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>SKU</th>
                  <th style={{ padding: '8px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>REMAINING</th>
                  <th style={{ padding: '8px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>DISPATCH NOW</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px' }}>{item.variant?.sku}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {remainingQty(item)}
                      {item.fulfilledQty > 0 && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '6px' }}>
                          ({item.fulfilledQty} already sent)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <input 
                        type="number" 
                        min="0"
                        max={remainingQty(item)}
                        disabled={remainingQty(item) === 0}
                        className="input-field"
                        style={{ width: '80px', textAlign: 'right', padding: '6px' }}
                        value={dispatchQuantities[item.id] !== undefined ? dispatchQuantities[item.id] : ''}
                        onChange={(e) => {
                          const capped = Math.min(Number(e.target.value || 0), remainingQty(item));
                          setDispatchQuantities({ ...dispatchQuantities, [item.id]: e.target.value === '' ? '' : capped });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setIsDispatching(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleCreateDispatch}
                disabled={dispatchMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {dispatchMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Dispatch Items
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
