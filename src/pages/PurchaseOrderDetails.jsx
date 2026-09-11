import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrderStatus, useReceiveGoods, useEmailPurchaseOrder } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { ArrowLeft, CheckCircle2, Box, Truck, Plus, Save, Download, Loader2, MessageCircle, Mail } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import PurchaseOrderPDF from '../components/PurchaseOrderPDF';
import VariantSearchModal from '../components/VariantSearchModal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl, buildPurchaseOrderMessage, toWhatsAppNumber } from '../utils/whatsappUtils';
import Select from '../components/common/Select';


export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const { data: po, isLoading: isLoadingPO } = usePurchaseOrder(isNew ? null : id);
  const { data: suppliers = [] } = useSuppliers();
  const { user } = useAuth();
  const createPO = useCreatePurchaseOrder();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const receiveGoods = useReceiveGoods();
  const emailPO = useEmailPurchaseOrder();

  const [formData, setFormData] = useState({
    supplierId: '',
    items: []
  });
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const [receivingQuantities, setReceivingQuantities] = useState({});
  const location = useLocation();

  useEffect(() => {
    if (isNew && location.state && formData.items.length === 0) {
      /*
       * Arriving here with a line already chosen.
       *
       * Built for the Alert Center ("this is low, order more") and now also used from a
       * variant's supplier list, where the person has already decided both the item AND who
       * they are buying it from. So the supplier comes across too when it is known -- it was
       * the one field this prefill never carried, which meant the shortest path to ordering
       * from a known supplier still ended with picking that supplier out of a dropdown you
       * had just come from.
       *
       * `?? prev.supplierId` rather than a plain assignment: the older callers send no
       * supplier at all, and must keep landing on an empty picker rather than a cleared one.
       */
      setFormData(prev => ({
        ...prev,
        supplierId: location.state.supplierId ?? prev.supplierId,
        items: [{
          variantId: location.state.variantId,
          sku: location.state.sku,
          variantCode: location.state.variantCode || '',
          barcode: location.state.barcode || '',
          productTitle: location.state.title || '',
          color: location.state.color || '',
          size: location.state.size || '',
          orderedQty: location.state.orderedQty,
          unitPrice: location.state.costPrice || 0,
          // Only the variant supplier panel knows this, and only it sends it. The older
          // callers leave it undefined, which getMarginWarning already reads as "nothing
          // to compare against" -- the same silence they had before, not a new one.
          sellingPrice: location.state.sellingPrice ?? null,
          variant: { product: { title: location.state.title } }
        }]
      }));
    }
  }, [isNew, location.state]);

  useEffect(() => {
    if (po && !isNew) {
      setFormData({
        supplierId: po.supplierId,
        // sellingPrice lives on the nested variant, not on the PO item itself -- promote
        // it to the top level so getMarginWarning (which only reads item.sellingPrice)
        // works the same way for a reopened Draft PO as it does for a brand-new one.
        items: po.items.map(i => ({
          ...i,
          // The variant's own price when it has one, otherwise the product's -- the same
          // order the backend resolves in. Reading only the variant's left the warning
          // silent for the 82% of variants that are priced at product level.
          sellingPrice: i.variant?.sellingPrice ? Number(i.variant.sellingPrice)
            : i.variant?.product?.basePrice ? Number(i.variant.product.basePrice)
            : null
        }))
      });
      
      const initialRec = {};
      po.items.forEach(item => {
        initialRec[item.id] = 0;
      });
      setReceivingQuantities(initialRec);
    }
  }, [po, isNew]);

  const handleCreate = async () => {
    if (!formData.supplierId) return toast.error('Select a supplier');
    if (formData.items.length === 0) return toast.error('Add at least one item');
    
    // Strict validation
    for (const item of formData.items) {
      if (item.orderedQty <= 0) return toast.error(`Quantity must be > 0 for SKU: ${item.sku}`);
      if (item.unitPrice < 0) return toast.error(`Cost must be >= 0 for SKU: ${item.sku}`);
    }
    
    // Include grand total in submission payload (it can be computed on backend but good to have)
    const payload = {
      ...formData,
      totalAmount: grandTotal
    };

    await createPO.mutateAsync(payload);
    navigate('/inventory/purchase-orders');
  };

  const supplierEmail = po?.supplier?.email?.trim();

  const handleEmailSupplier = () => {
    // Confirmed rather than fired on the first click, because unlike every other button on
    // this page it reaches outside the shop. An order sent to the wrong supplier cannot be
    // recalled, so the address is shown in the question.
    setConfirmState({
      isOpen: true,
      title: 'Email this order to the supplier',
      message: `The full order will be emailed to ${supplierEmail}.

This actually sends it. Once it goes, the order is marked as Sent and you can start receiving stock against it.`,
      confirmText: 'Send it',
      onConfirm: async () => {
        await emailPO.mutateAsync({ id });
      }
    });
  };

  const handleMarkSent = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Mark Purchase Order as Sent',
      // Was: "This will mark the purchase order as sent to the supplier", which read as
      // though pressing it delivered something. It never has -- it only moves the status,
      // and until now there was no way to send a PO from the app at all. With a real send
      // button beside it, the difference has to be stated rather than left for the user to
      // discover when the supplier says they never received anything.
      message: 'This only records that the order has been sent -- it does not deliver anything to the supplier.\n\nUse this when you have already sent the order some other way, by phone or in person. To actually send it from here, use "Email to supplier" or "Send on WhatsApp".\n\nOnce marked as sent, you can start receiving stock against this order.',
      confirmText: 'Confirm',
      onConfirm: async () => {
        await updateStatus.mutateAsync({ id, status: 'SENT' });
      }
    });
  };

  const handleReceiveGoods = async () => {
    const receipts = Object.entries(receivingQuantities)
      .map(([poItemId, qty]) => ({
        poItemId,
        quantityReceived: parseInt(qty) || 0
      }))
      .filter(r => r.quantityReceived > 0);

    if (receipts.length === 0) return toast.error('No quantities to receive');

    try {
      await receiveGoods.mutateAsync({ id, receipts });
      // The toast is handled by the hook now
      // Reset receiving quantities
      const initialRec = {};
      po.items.forEach(item => {
        initialRec[item.id] = 0;
      });
      setReceivingQuantities(initialRec);
    } catch (err) {
      // The toast is handled by the hook
    }
  };

  const handleAddVariant = (variant) => {
    setFormData(prev => {
      const existingIdx = prev.items.findIndex(i => i.variantId === variant.id);
      const newItems = [...prev.items];
      
      if (existingIdx >= 0) {
        // Merge duplicate
        newItems[existingIdx].orderedQty += variant.orderedQty;
        // Optionally update cost to latest if different, but usually we just sum qty
      } else {
        // Add new
        newItems.push({
          variantId: variant.id,
          sku: variant.sku,
          variantCode: variant.variantCode,
          barcode: variant.barcode,
          productTitle: variant.productTitle,
          color: variant.color,
          size: variant.size,
          orderedQty: variant.orderedQty,
          unitPrice: variant.unitPrice,
          // effectiveSellingPrice, not sellingPrice: most variants have no price of their
          // own and sell at the product's, and the margin warning was silent for all of them.
          sellingPrice: variant.effectiveSellingPrice ?? variant.sellingPrice,
          variant: { product: { title: variant.productTitle } }
        });
      }
      return { ...prev, items: newItems };
    });
    setShowVariantModal(false);
  };

  const grandTotal = formData.items.reduce((sum, item) => sum + (item.orderedQty * item.unitPrice), 0);

  // Built from the SAVED order rather than formData: this button only appears on a
  // persisted DRAFT, and formData carries unsaved edits that the supplier would otherwise
  // be told about before they exist on the order.
  const whatsAppUrl = po && !isNew
    ? buildWhatsAppUrl(
        po.supplier?.phone,
        buildPurchaseOrderMessage({
          poNumber: po.poNumber,
          supplierName: po.supplier?.name,
          items: po.items || [],
          total: po.totalAmount ?? grandTotal,
          expectedDeliveryDate: po.expectedDeliveryDate,
          senderName: user?.name
        })
      )
    : null;

  // Approximates the margin this cost would leave against what the item actually sells
  // for -- not a full moving-average blend (that only happens for real once the PO is
  // received), just an early warning so the merchant isn't surprised after the fact.
  const getMarginWarning = (item) => {
    if (!item.sellingPrice) return null; // nothing to compare against yet
    const margin = ((item.sellingPrice - item.unitPrice) / item.sellingPrice) * 100;
    if (margin < 0) return { text: `This costs more than the ₹${item.sellingPrice} selling price -- you would lose money on every piece`, color: 'var(--accent-danger)' };
    // Under 1% reads as "0% margin" once rounded, which looks like a display glitch rather
    // than a warning. Said in rupees instead, because ₹666 on a ₹45,666 saree is the sentence
    // that lands -- this is a real order on this platform.
    if (margin < 1) return { text: `Only ₹${(item.sellingPrice - item.unitPrice).toFixed(0)} per piece at this cost`, color: 'var(--accent-danger)' };
    if (margin < 15) return { text: `Only ~${margin.toFixed(0)}% margin at this cost`, color: 'var(--accent-danger)' };
    if (margin < 30) return { text: `~${margin.toFixed(0)}% margin at this cost`, color: 'var(--accent-warning, #f59e0b)' };
    return null; // healthy margin, no need to call it out
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoadingPO && !isNew) return <PageLoader text="Loading PO details..." />;

  // Loading was the only state guarded here, so a PO that finished loading as nothing --
  // deleted, belonging to another tenant, or simply a failed request -- fell straight
  // through to `po.poNumber` below and took the whole page down to a blank screen with the
  // real cause only visible in the console. A missing order is an ordinary thing to land on
  // from a stale link or a back button; it deserves a sentence, not a crash.
  if (!isNew && !po) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Purchase order not found
        </h2>
        <p style={{ fontSize: '14px', margin: '0 0 24px' }}>
          It may have been deleted, or the link is out of date.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/inventory/purchase-orders')}>
          Back to purchase orders
        </button>
      </div>
    );
  }

  const isReceivable = po && (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Top Bar */}
      <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', width: 'fit-content', fontWeight: '500', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Wraps, because on a phone this row held 519px of buttons in 346px of space and
            simply cut the last two off: "Mark as Sent" and "Download PDF" were not merely
            awkward to reach, they were unreachable, and the page did not scroll sideways to
            reveal them. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-primary)' }}>
              {isNew ? 'Create Purchase Order' : po.poNumber}
            </h1>
            {!isNew && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Created on {new Date(po.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {!isNew && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '6px 12px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                fontWeight: '700', 
                letterSpacing: '0.5px',
                color: po.status === 'DRAFT' ? 'var(--text-secondary)' : 'var(--text-primary)',
                backgroundColor: po.status === 'DRAFT' ? 'var(--bg-input)' : 'var(--accent-gold)'
              }}>
                {po.status.replace('_', ' ')}
              </span>
              {/* The one button on this page that actually delivers the order. Placed first
                  because it is the channel a supplier is most likely to keep a record of, and
                  because unlike the two beside it, it needs no second step from the user.
                  Disabled rather than hidden when the supplier has no email, so the reason is
                  readable instead of the button simply not being there. */}
              {po.status === 'DRAFT' && (
                <button
                  onClick={handleEmailSupplier}
                  disabled={!supplierEmail || emailPO.isPending}
                  className="btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: (!supplierEmail || emailPO.isPending) ? 0.5 : 1,
                    cursor: (!supplierEmail || emailPO.isPending) ? 'not-allowed' : 'pointer'
                  }}
                  title={
                    supplierEmail
                      ? `Email the order to ${supplierEmail}`
                      : `${po?.supplier?.name || 'This supplier'} has no email address -- add one on the supplier to send from here`
                  }
                >
                  {emailPO.isPending
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Mail size={16} />}
                  {emailPO.isPending ? 'Sending...' : 'Email to supplier'}
                </button>
              )}

              {/* Opens WhatsApp with the order pre-filled; the user presses Send. Placed
                  before "Mark as Sent" because that is the real order of events -- send it,
                  then record that you did. Disabled rather than hidden when the supplier has
                  no usable number, so the reason is visible instead of the button just being
                  missing. */}
              {po.status === 'DRAFT' && (
                whatsAppUrl ? (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.4)' }}
                    title={`Open WhatsApp chat with ${po?.supplier?.name || 'the supplier'}`}
                  >
                    <MessageCircle size={16} />
                    Send on WhatsApp
                  </a>
                ) : (
                  <button
                    className="btn-secondary"
                    disabled
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5, cursor: 'not-allowed' }}
                    title={
                      po?.supplier?.phone
                        ? `${po.supplier.phone} is not a valid WhatsApp number -- add the country code on the supplier`
                        : 'This supplier has no phone number saved'
                    }
                  >
                    <MessageCircle size={16} />
                    Send on WhatsApp
                  </button>
                )
              )}

              {po.status === 'DRAFT' && (
                <button 
                  onClick={handleMarkSent}
                  className="btn-primary"
                >
                  Mark as Sent
                </button>
              )}
              
              <PDFDownloadLink
                document={<PurchaseOrderPDF order={po} />}
                fileName={`${po.poNumber}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading }) => (
                  <button 
                    disabled={loading}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={16} />
                    {loading ? 'Preparing PDF...' : 'Download PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid Layout */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }} className="mobile-stack-grid">
        
        {/* Left Column (Main Info) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Supplier Details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Truck size={18} style={{ color: 'var(--text-secondary)' }} />
              Supplier Details
            </h2>
            {/* Editable only while the PO is unsaved. There is no update endpoint for an
                existing PO -- the Save button below renders for `isNew` alone -- so on a
                saved DRAFT this dropdown accepted a new supplier, changed nothing, and
                quietly reverted on the next refresh. The line items already follow this
                same isNew-only rule. */}
            {isNew ? (
              <div>
                <Select 
                  className="input-field"
                  value={formData.supplierId}
                  onChange={e => setFormData({...formData, supplierId: e.target.value})}
                  style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a1a1aa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>
                  ))}
                </Select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: '600', fontSize: '18px', color: 'var(--text-primary)' }}>{po?.supplier?.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{po?.supplier?.supplierCode}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Box size={18} style={{ color: 'var(--text-secondary)' }} />
                Line Items
              </h2>
              {isNew && (
                <button 
                  onClick={() => setShowVariantModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '6px' }}
                >
                  <Plus size={14} /> Add Item
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>Item</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>You pay</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Ordered</th>
                    <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Total</th>
                    {!isNew && <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Received</th>}
                    {isReceivable && <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right', width: '120px' }}>Receive Now</th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.productTitle || item.variant?.product?.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        {isNew ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>₹</span>
                              <input
                                type="number"
                                min="0"
                                className="input-field"
                                style={{ width: '80px', textAlign: 'right', padding: '6px 8px' }}
                                value={item.unitPrice}
                                onChange={e => {
                                  const newItems = [...formData.items];
                                  newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                            </div>
                            {(() => {
                              const warning = getMarginWarning(item);
                              return warning ? (
                                <span style={{ fontSize: '11px', color: warning.color, whiteSpace: 'nowrap' }}>{warning.text}</span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{ color: 'var(--text-primary)' }}>₹{Number(item.unitPrice).toLocaleString()}</span>
                            {/* Previously only shown while creating a new PO -- a merchant
                                reopening a saved Draft to review it before sending or
                                confirming had no way to see this at all. */}
                            {(() => {
                              const warning = getMarginWarning(item);
                              return warning ? (
                                <span style={{ fontSize: '11px', color: warning.color, whiteSpace: 'nowrap' }}>{warning.text}</span>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        {isNew ? (
                          <input 
                            type="number"
                            min="1"
                            className="input-field"
                            style={{ width: '80px', textAlign: 'right', padding: '6px 8px' }}
                            value={item.orderedQty}
                            onChange={e => {
                              const newItems = [...formData.items];
                              newItems[idx].orderedQty = parseInt(e.target.value) || 0;
                              setFormData({...formData, items: newItems});
                            }}
                          />
                        ) : (
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.orderedQty}</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '500', color: 'var(--text-primary)' }}>
                        ₹{(item.orderedQty * item.unitPrice).toLocaleString()}
                      </td>
                      {!isNew && (
                        <td style={{ padding: '16px 0', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.receivedQty}
                        </td>
                      )}
                      {isReceivable && (
                        <td style={{ padding: '16px 0', textAlign: 'right' }}>
                          {item.receivedQty < item.orderedQty ? (
                            <input 
                              type="number"
                              min="0"
                              max={item.orderedQty - item.receivedQty}
                              className="input-field"
                              style={{ width: '90px', textAlign: 'right', padding: '8px', border: '1px solid var(--accent-gold)' }}
                              value={receivingQuantities[item.id] || ''}
                              onChange={e => setReceivingQuantities({...receivingQuantities, [item.id]: e.target.value})}
                            />
                          ) : (
                            <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                              <CheckCircle2 size={16} /> Full
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr>
                      <td colSpan={isNew ? 4 : (isReceivable ? 6 : 5)} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No items added to this PO.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ padding: '16px 0', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Grand Total</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>
                      ₹{grandTotal.toLocaleString()}
                    </td>
                    {!isNew && <td colSpan={isReceivable ? 2 : 1}></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isNew && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <button 
                onClick={handleCreate}
                disabled={createPO.isPending}
                className="btn-primary"
                style={{ 
                  width: '100%', padding: '12px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', gap: '8px', fontSize: '14px',
                  opacity: createPO.isPending ? 0.7 : 1, cursor: createPO.isPending ? 'not-allowed' : 'pointer'
                }}
              >
                {createPO.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {createPO.isPending ? 'Creating PO...' : 'Create PO'}
              </button>
            </div>
          )}

          {isReceivable && (
            <div className="glass-panel" style={{ padding: '24px', borderColor: 'var(--accent-gold)' }}>
              <h3 style={{ fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px', fontSize: '16px' }}>Goods Receipt (GRN)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                Enter quantities in the line items table and click below to receive them into your physical inventory.
              </p>
              <button 
                onClick={handleReceiveGoods}
                disabled={receiveGoods.isPending}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', background: 'var(--accent-gold)', color: 'var(--bg-dark)' }}
              >
                {receiveGoods.isPending ? 'Processing...' : 'Confirm Receipt'}
              </button>
            </div>
          )}
        </div>

      </motion.div>
      {/* The picker needs to know who the order is for: with a supplier it opens on that
          vendor's own items instead of an empty search box, and flags anything searched for
          that they have never supplied. Read from formData rather than the saved PO so a
          supplier just chosen on an unsaved draft takes effect immediately. */}
      <VariantSearchModal 
        isOpen={showVariantModal} 
        onClose={() => setShowVariantModal(false)}
        onSelect={handleAddVariant}
        supplierId={formData.supplierId || po?.supplierId || null}
        supplierName={
          suppliers.find(s => s.id === (formData.supplierId || po?.supplierId))?.name
          || po?.supplier?.name
          || null
        }
      />
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />
    </motion.div>
  );
}
