import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrderStatus, useReceiveGoods } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { ArrowLeft, CheckCircle2, Box, Truck, Plus, Save, Download, Loader2, MessageCircle } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import PurchaseOrderPDF from '../components/PurchaseOrderPDF';
import VariantSearchModal from '../components/VariantSearchModal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl, buildPurchaseOrderMessage, toWhatsAppNumber } from '../utils/whatsappUtils';

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
      // Alert center prefill integration
      setFormData(prev => ({
        ...prev,
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
        items: po.items.map(i => ({ ...i, sellingPrice: i.variant?.sellingPrice ? Number(i.variant.sellingPrice) : null }))
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

  const handleMarkSent = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Mark Purchase Order as Sent',
      // Was: "This will mark the purchase order as sent to the supplier", which read as
      // though pressing it delivered something. It never has -- it only moves the status,
      // and until now there was no way to send a PO from the app at all. With a real send
      // button beside it, the difference has to be stated rather than left for the user to
      // discover when the supplier says they never received anything.
      message: 'This only records that the order has been sent -- it does not deliver anything to the supplier.\n\nIf you have not sent it yet, use "Send on WhatsApp" first.\n\nOnce marked as sent, you can start receiving stock against this order.',
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
          sellingPrice: variant.sellingPrice,
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
    if (margin < 0) return { text: `This costs more than the ₹${item.sellingPrice} selling price`, color: 'var(--accent-danger)' };
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <select 
                  className="input-field"
                  value={formData.supplierId}
                  onChange={e => setFormData({...formData, supplierId: e.target.value})}
                  style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a1a1aa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>
                  ))}
                </select>
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
                    <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Cost</th>
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
      <VariantSearchModal 
        isOpen={showVariantModal} 
        onClose={() => setShowVariantModal(false)}
        onSelect={handleAddVariant}
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
