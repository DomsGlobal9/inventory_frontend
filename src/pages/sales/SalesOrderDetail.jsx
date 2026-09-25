import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useSalesOrderDetails, useConfirmOrder, useCancelOrder } from '../../hooks/useSalesOrders';
import { useCreateDispatch } from '../../hooks/useDispatches';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Truck, Printer, Undo2 } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
/*
 * Exact throughout this page, not rounded.
 *
 * formatINR rounds to whole rupees, which is right on a dashboard. It is wrong on an order,
 * where the numbers have to add up in front of somebody: a line of 150 less 72.50 rendered as
 * 150, 72.50 and 78 does not, and a grand total shown as 418 on an order worth 417.50 is a
 * misstatement of what a customer pays. formatINRExact still prints whole rupees when the
 * amount IS whole, so an ordinary order looks exactly as it did.
 */
import { formatINRExact } from '../../utils/formatUtils';

import PageLoader from '../../components/PageLoader';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';
import { ShelvesUsed } from '../../components/shelves/ShelfLinks';
import { ORDER_STATUS, StatusPill } from '../../components/sales/labels';
import { useDialog } from '../../hooks/useDialog';
import WhatsAppSendButton from '../../components/whatsapp/WhatsAppSendButton';
import { buildWhatsAppUrl } from '../../utils/whatsappUtils';
import { api } from '../../lib/api';
import BillPDF from '../../components/BillPDF';
import { makePdf } from '../../components/pdf/downloadPdf';
import { logoAsPng } from '../../components/pdf/pdfLogo';

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
  // Which irreversible action is waiting on a yes: 'confirm', 'cancel', or none.
  // One piece of state rather than a boolean each, because the two can never be open at once
  // and a single value cannot drift into a state where both are true.
  const [pendingAction, setPendingAction] = useState(null);
  // Readable in the same tick it is written, unlike state. See handleCreateDispatch.
  const dispatchInFlight = useRef(false);
  // Keyboard and screen-reader behaviour for the Create Dispatch box (see hooks/useDialog). Not
  // closable while the dispatch is being sent, so the answer cannot arrive to a closed box.
  const closeDispatch = () => { if (!dispatchMutation.isPending) setIsDispatching(false); };
  const dispatchDialogRef = useDialog(isDispatching, { onClose: closeDispatch, canClose: !dispatchMutation.isPending });

  if (isLoading) {
    return <PageLoader text="LOADING ORDERS..." />;
  }
  if (!order) return <div style={{ padding: '48px', textAlign: 'center', color: 'red' }}>Order not found</div>;

  /**
   * Both of these used to be window.confirm(). Three things were wrong with that: the box is
   * the browser's, so it carries the site's bare hostname and none of this app's design; it
   * freezes the entire tab until answered; and because confirm() is synchronous the mutation
   * fired only after it closed, leaving the user on an unchanged screen with no indication
   * anything had started -- for an action that reserves or releases real stock.
   *
   * ConfirmModal awaits the mutation, so the button says "Working..." while the request is in
   * flight and the dialog stays open if it fails.
   */
  const ACTIONS = {
    confirm: {
      title: 'Confirm this order?',
      message: 'Inventory stock will be reserved against this order and will no longer be available to sell elsewhere.',
      confirmText: 'Confirm order',
      confirmStyle: 'primary',
      run: () => confirmMutation.mutateAsync(id)
    },
    // Once part of an order has gone out it is closed, not cancelled: what went out is a sale and
    // stays in the day book; only what is still held goes back on sale.
    cancel: order?.status === 'PARTIALLY_DISPATCHED' ? {
      title: 'Close the rest of this order?',
      message: 'What was already sent stays a sale. The pieces not sent yet are released back to stock, and the order is closed. This cannot be undone.',
      confirmText: 'Close order',
      confirmStyle: 'danger',
      run: () => cancelMutation.mutateAsync(id)
    } : {
      title: 'Cancel this order?',
      message: 'All stock reserved for this order will be released back into available inventory. This cannot be undone.',
      confirmText: 'Cancel order',
      confirmStyle: 'danger',
      run: () => cancelMutation.mutateAsync(id)
    }
  };
  const action = pendingAction ? ACTIONS[pendingAction] : null;

  // What's left to ship on a line. Every quantity shown on this page used to be the full
  // ordered qty regardless of what had already gone out, so after a partial dispatch the
  // page invited the user to ship the whole order a second time -- and the backend
  // rejected it with "Cannot dispatch N. Only M reserved remaining."
  const remainingQty = (item) => Math.max(0, (item.quantity || 0) - (item.fulfilledQty || 0));

  /*
   * What a line still holds back from sale. The server reads it off the live reservations
   * (heldQty), which is the only thing that knows: ordered-minus-sent guessed per status, and
   * missed that a part-sent order closed short ends DISPATCHED, so its unsent line said
   * "RESERVED 1" for a piece that was already back on sale. The guess stays only for a server
   * too old to send heldQty -- and even then an order that is finished holds nothing.
   */
  const heldQty = (item) => {
    if (item.heldQty !== undefined && item.heldQty !== null) return Number(item.heldQty) || 0;
    return ['CANCELLED', 'DISPATCHED', 'DRAFT'].includes(order.status) ? 0 : remainingQty(item);
  };

  /*
   * Everything taken off one line, from either direction.
   *
   * `lineDiscount` is the line's own markdown -- what the till or the website said it charged.
   * `allocatedDiscount` is its share of a discount typed against the whole order. They are
   * stored apart so that re-editing an order can replace one without disturbing the other, but
   * to somebody reading the order they are simply "what came off this line".
   */
  const discountOf = (item) => Number(item.lineDiscount || 0) + Number(item.allocatedDiscount || 0);

  // The column appears only when there is something to put in it, so an ordinary order looks
  // exactly as it did before any of this existed.
  const anyDiscount = (order.items || []).some(i => discountOf(i) > 0);

  /*
   * WHY the money came off, not only that it did.
   *
   * The line columns can say a saree was sold at 9,600 instead of 12,000. They cannot say
   * whether that was the Deepavali offer or somebody's decision about a marked hem -- and six
   * months later that is the only question anybody asks about a discount.
   *
   * For a MANUAL discount the title IS the reason that was typed at the till. It is required
   * precisely so that it can be read here; a reason collected and never shown may as well not
   * have been collected.
   */
  const DISCOUNT_SOURCES = {
    OFFER:   { label: 'Offer',  colour: 'var(--accent-success)' },
    MANUAL:  { label: 'By hand', colour: 'var(--accent-warning)' },
    SHOPIFY: { label: 'Shopify', colour: 'var(--text-secondary)' }
  };
  const orderDiscounts = order.discounts || [];

  const handleOpenDispatch = () => {
    dispatchInFlight.current = false;
    const initialQs = {};
    (order.items || []).forEach(item => {
      initialQs[item.id] = 0;
    });
    setDispatchQuantities(initialQs);
    setIsDispatching(true);
  };

  const handleCreateDispatch = () => {
    /*
     * One dispatch per press, however fast the pressing is.
     *
     * `disabled={dispatchMutation.isPending}` is React state, and state does not take effect
     * until the next render -- so a double-click sends the request twice. Measured: three clicks
     * produced one 201 and two 400s. The server was right (its Serializable transaction refused
     * the duplicates) but the person saw two red toasts for a dispatch that had in fact worked,
     * and the modal stayed open inviting them to try again.
     *
     * A ref is readable in the tick it is written, which is what this needs.
     */
    if (dispatchInFlight.current) return;
    dispatchInFlight.current = true;

    const itemsToDispatch = [];
    Object.keys(dispatchQuantities).forEach(itemId => {
      const qty = parseInt(dispatchQuantities[itemId]);
      const item = (order.items || []).find(i => i.id === itemId);
      if (qty > 0 && item && qty <= remainingQty(item)) {
        itemsToDispatch.push({ salesOrderItemId: itemId, quantity: qty });
      }
    });

    if (itemsToDispatch.length === 0) {
      // Nothing was sent, so the guard has to come back off or the button is dead until the
      // modal is reopened.
      dispatchInFlight.current = false;
      toast.error('Enter a quantity greater than 0 for at least one item.');
      return;
    }

    dispatchMutation.mutate({ salesOrderId: id, items: itemsToDispatch }, {
      onSuccess: () => setIsDispatching(false),
      // Released on failure only. After a success the modal closes, and handleOpenDispatch
      // clears it again the next time it is opened.
      onError: () => { dispatchInFlight.current = false; }
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>Order {order.orderNumber}</h1>
            <StatusPill map={ORDER_STATUS} value={order.status} />
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
            Customer: {order.customer?.name} | Created: {new Date(order.createdAt).toLocaleDateString()}
            {order.atCounter && ' | Sold at the counter'}
            {order.location?.name && ` | ${order.location.name}`}
            {order.createdBy?.name && ` | By ${order.createdBy.name}`}
          </p>
        </div>
        {/* A customer bringing something from this bill back: straight to Take a return, bill chosen. */}
        {['DISPATCHED', 'PARTIALLY_DISPATCHED'].includes(order.status) && (can('return:counter') || (can('return:create') && can('return:complete'))) && (
          <button className="btn-secondary" onClick={() => navigate(`/returns/new?order=${order.id}`)}
            style={{ marginLeft: order.atCounter ? 0 : 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', order: order.atCounter ? 1 : 0 }}>
            <Undo2 size={15} /> Take a return
          </button>
        )}
        {order.atCounter && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button className="btn-secondary" onClick={() => window.open(`/orders/${order.id}/receipt`, '_blank', 'noopener')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} /> Print receipt
            </button>
            {/* The bill as a PDF, straight to the customer from the shop's WhatsApp -- built from
                the same receipt the printed copy uses. */}
            <WhatsAppSendButton
              kind="BILL"
              id={order.id}
              permission="sales_order:view"
              fileName={`Bill-${order.orderNumber}.pdf`}
              recipientLabel={order.customer?.name}
              buildPdf={async () => {
                const sale = (await api.get(`/counter-sales/${order.id}/receipt`)).data;
                return makePdf(<BillPDF sale={sale} logo={await logoAsPng(sale?.shop?.logoUrl)} />);
              }}
              // The way round it when the shop's number cannot be used -- not linked, or the
              // customer replied STOP: open the shopkeeper's own WhatsApp with the bill's number
              // already typed, the same as the return note page offers.
              fallbackHref={buildWhatsAppUrl(order.customer?.phone,
                `Hello${order.customer?.name ? ` ${order.customer.name}` : ''}, your bill ${order.orderNumber} is ready.`)}
            />
          </div>
        )}
      </div>

      {/*
        * mobile-stack-grid, which every other two-column page here already uses and this one
        * never did. Without it the template stays `1fr 350px` on a phone: 350px is wider than
        * the screen, so the 1fr column resolves to nothing and the whole Line Items table is
        * squeezed out of existence -- leaving a page that is just a Summary panel.
        */}
      <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
        
        {/*
          * Main Area: Items
          *
          * minWidth: 0 is doing real work. A grid item defaults to `min-width: auto`, which means
          * "never shrink below your content" -- so this column sized itself to the full width of
          * the table (738px) inside a 351px grid on a phone, and the card's `overflow: hidden`
          * quietly cut the rest off. The scroll container below could not scroll because it had
          * been given all the room it asked for; it just had nowhere to put it.
          */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <ShelvesUsed orderId={id} />

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Line Items</h3>
            </div>

            {/*
              * The table scrolls sideways inside the card rather than being clipped by it.
              *
              * The card is `overflow: hidden`, so on a phone every column past PRODUCT simply
              * vanished -- quantity, price and total were unreachable, with nothing on screen to
              * suggest there was more. Adding the DISCOUNT column made a page that was already
              * missing its money worse, which is what turned this up.
              *
              * minWidth keeps the columns from crushing into each other before the scroll
              * starts; on a desktop the table is narrower than the card and nothing changes.
              */}
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
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
                  {anyDiscount && (
                    <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>DISCOUNT</th>
                  )}
                  <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>TOTAL</th>
                  <th style={{ padding: '16px 24px', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {order.items?.length === 0 ? (
                  <tr><td colSpan={(order.status === 'DRAFT' ? 6 : 8) + (anyDiscount ? 1 : 0)} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No items added yet.</td></tr>
                ) : (
                  order.items?.map(item => {
                    // DISPATCHED is fulfilledQty, which DispatchService maintains. RESERVED is
                    // heldQty, read off the line's live reservations (see heldQty above).
                    return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: '500' }}>{item.variant?.sku}</td>
                      <td style={{ padding: '16px 24px' }}>{item.variant?.product?.title}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>{item.quantity}</td>
                      {order.status !== 'DRAFT' && (
                        <>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--accent-warning)', fontWeight: '500' }}>
                            {heldQty(item)}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--accent-success)', fontWeight: '500' }}>
                            {item.fulfilledQty || 0}
                          </td>
                        </>
                      )}
                      {/*
                        * The list price above the net one, whenever they differ.
                        *
                        * The order used to be recorded at list price and discounted only at the
                        * grand total, so one number per line was the whole truth. It is not any
                        * more: a line can be sold for less than it is listed at, and showing only
                        * the net leaves a merchant looking at "₹993" for a saree their catalogue
                        * says is ₹999 with nothing on the screen to explain the difference.
                        */}
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {discountOf(item) > 0 && Number(item.listUnitPrice) !== Number(item.unitPrice) && (
                          <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: '8px' }}>
                            {formatINRExact(Number(item.listUnitPrice))}
                          </span>
                        )}
                        {formatINRExact(Number(item.unitPrice))}
                      </td>
                      {anyDiscount && (
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: discountOf(item) > 0 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                          {discountOf(item) > 0 ? `-${formatINRExact(discountOf(item))}` : '—'}
                        </td>
                      )}
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>{formatINRExact(Number(item.totalPrice))}</td>
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
        </div>

        {/* Right Sidebar: Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600' }}>Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Subtotal ({order.items?.length} items)</span>
              <span>{formatINRExact(Number(order.subtotal))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: orderDiscounts.length > 0 ? '8px' : '12px', color: 'var(--text-secondary)' }}>
              <span>Discount</span>
              <span>-{formatINRExact(Number(order.discountAmount))}</span>
            </div>

            {/*
              * Shown only when the order actually carries these rows. An order taken before this
              * existed, or one ingested without a breakdown, looks exactly as it always did
              * rather than growing an empty heading.
              */}
            {orderDiscounts.length > 0 && (
              <div style={{ margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {orderDiscounts.map(discount => {
                  const source = DISCOUNT_SOURCES[discount.source] || DISCOUNT_SOURCES.OFFER;
                  return (
                    <div
                      key={discount.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        gap: '12px', fontSize: '12px', color: 'var(--text-secondary)'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                        <span style={{
                          flexShrink: 0, fontSize: '10px', fontWeight: '600', letterSpacing: '0.04em',
                          textTransform: 'uppercase', color: source.colour,
                          border: `1px solid ${source.colour}`, borderRadius: '4px', padding: '1px 5px'
                        }}>
                          {source.label}
                        </span>
                        {/*
                          * Truncated rather than wrapped, with the whole thing on hover. A reason
                          * typed at a counter can be a sentence, and letting it push the amount
                          * off the panel would hide the number this row exists to explain.
                          */}
                        <span
                          title={discount.title}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {discount.title}
                        </span>
                      </span>
                      <span style={{ flexShrink: 0 }}>-{formatINRExact(Number(discount.amount))}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Tax</span>
              <span>+{formatINRExact(Number(order.taxAmount))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-secondary)' }}>
              <span>Shipping</span>
              <span>+{formatINRExact(Number(order.shippingAmount))}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontWeight: '600', fontSize: '18px' }}>
              <span>Grand Total</span>
              <span>{formatINRExact(Number(order.total))}</span>
            </div>

            {order.status === 'DRAFT' && (
              <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {can('sales_order:confirm') && (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={(() => setPendingAction('confirm'))}
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
                    style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                    onClick={(() => setPendingAction('cancel'))}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                    {order.status === 'PARTIALLY_DISPATCHED' ? 'Close rest of order' : 'Cancel Order'}
                  </button>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Dispatching will deduct physical inventory and recognize revenue.
                </p>
              </div>
            )}
          </div>

          {/* Money taken for this order, and paid back. Worked out from the rows, never stored twice. */}
          {(order.atCounter || order.payments?.length > 0) && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Payments</h3>
                <span style={{ fontSize: '13px', fontWeight: 600, color: order.payment?.due > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                  {order.payment?.due > 0 ? `${formatINRExact(order.payment.due)} due` : order.payment?.status === 'REFUNDED' ? 'Refunded' : 'Paid'}
                </span>
              </div>
              {order.payments?.length === 0 ? (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No payment recorded.</div>
              ) : order.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: '14px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>
                      {p.kind === 'REFUND' ? 'Refund · ' : ''}{({ CASH: 'Cash', UPI: 'UPI', CARD: 'Card', POINTS: 'Loyalty points', CREDIT: 'Store credit' })[p.method]}
                      {p.reference ? <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · {p.reference}</span> : null}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(p.receivedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      {p.receivedBy?.name ? ` · ${p.receivedBy.name}` : ''}
                      {Number(p.changeGiven) > 0 ? ` · got ${formatINRExact(Number(p.cashReceived))}, gave back ${formatINRExact(Number(p.changeGiven))}` : ''}
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.kind === 'REFUND' ? '-' : ''}{formatINRExact(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Dispatch Modal */}
      {isDispatching && (
        createPortal(<div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDispatch(); }}
        >
          <div ref={dispatchDialogRef} role="dialog" aria-modal="true" aria-labelledby="create-dispatch-title" tabIndex={-1}
            className="card" style={{ width: '600px', maxWidth: '90vw', padding: '24px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
            <div className="table-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 id="create-dispatch-title" style={{ margin: 0, fontSize: '20px' }}>Create Dispatch</h3>
              <button type="button" aria-label="Close" onClick={closeDispatch} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
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
                        aria-label={`How many of ${item.variant?.sku || 'this item'} to send now`}
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
              <button type="button" className="btn-secondary" onClick={closeDispatch}>Cancel</button>
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
        </div>, document.body)
      )}

      <ConfirmModal
        isOpen={!!action}
        onClose={() => setPendingAction(null)}
        onConfirm={() => action.run()}
        title={action?.title}
        message={action?.message}
        confirmText={action?.confirmText}
        confirmStyle={action?.confirmStyle}
      />

    </div>
  );
}
