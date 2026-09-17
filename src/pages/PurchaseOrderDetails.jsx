import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrderStatus, useReceiveGoods, useEmailPurchaseOrder, useSetPurchaseOrderDeliverTo } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { ArrowLeft, CheckCircle2, Box, Truck, Plus, Save, Download, Loader2, MessageCircle, Mail, FileText, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import PurchaseOrderPDF from '../components/PurchaseOrderPDF';
import GoodsReceiptPDF from '../components/GoodsReceiptPDF';
import { downloadPdf } from '../components/pdf/downloadPdf';
import { logoAsPng } from '../components/pdf/pdfLogo';
import { useBranding } from '../hooks/useBranding';
import { useLocationContext } from '../contexts/LocationContext';
import VariantSearchModal from '../components/VariantSearchModal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl, buildPurchaseOrderMessage, toWhatsAppNumber } from '../utils/whatsappUtils';
import Select from '../components/common/Select';
import { usePermission } from '../hooks/usePermission';
import { PutAwayNotice } from '../components/shelves/ShelfLinks';


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
  const setDeliverTo = useSetPurchaseOrderDeliverTo();
  const { can } = usePermission();

  const [formData, setFormData] = useState({
    supplierId: '',
    // The store this order is for: where the supplier delivers, and where receiving expects it.
    locationId: '',
    items: []
  });
  // Changing the store on a saved order: null while not editing.
  const [deliverToDraft, setDeliverToDraft] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const [receivingQuantities, setReceivingQuantities] = useState({});
  const location = useLocation();

  // ── Receiving, and the documents it produces ──
  const { data: branding } = useBranding();
  const { locations = [], currentLocation } = useLocationContext();
  const activeLocations = locations.filter(l => l.active !== false);
  const [receiveLocationId, setReceiveLocationId] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  // Who took the goods at the door -- typed, because the login entering the receipt is often not
  // the person who signed for the boxes, and the receipt names the one who did.
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [printing, setPrinting] = useState(null);
  // One key per delivery being entered. A double click, or pressing again after a slow answer,
  // sends the same key, and the server hands back the receipt it already made instead of
  // bringing the same goods in twice. A new key only once a receipt has come back.
  const newKey = () => (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const requestKey = useRef(newKey());
  const receiving = useRef(false);

  // The store the order is for; if it has none or it is switched off, the one chosen at the top of
  // the app; then the first active one. Waits for the order to load, or the top bar would win the
  // race on every page open and "Receive into" would start on the wrong store.
  useEffect(() => {
    if (receiveLocationId || activeLocations.length === 0 || isNew || !po) return;
    const preferred = activeLocations.find(l => l.id === po.locationId)
      || activeLocations.find(l => l.id === currentLocation?.id)
      || activeLocations[0];
    setReceiveLocationId(preferred.id);
  }, [activeLocations.length, currentLocation?.id, po?.id, po?.locationId]);

  // A new order is for the store the alert was about, else the store chosen at the top of the app.
  useEffect(() => {
    if (!isNew || formData.locationId || activeLocations.length === 0) return;
    const preferred = activeLocations.find(l => l.id === location.state?.locationId)
      || activeLocations.find(l => l.id === currentLocation?.id)
      || activeLocations[0];
    setFormData(prev => ({ ...prev, locationId: preferred.id }));
  }, [isNew, activeLocations.length, currentLocation?.id, location.state?.locationId]);

  const printDocument = async (kind, receipt) => {
    if (!po || printing) return;
    const busyKey = kind === 'po' ? 'po' : receipt.id;
    setPrinting(busyKey);
    try {
      // Read fresh, not from the page's cache: a document goes to a supplier, and the owner may
      // have changed the logo or address a minute ago from another screen or another person's
      // login. The cached copy is kept for five minutes; this costs one small request.
      const shop = await api.get('/branding').then(r => r.data).catch(() => branding) || {};
      const logo = await logoAsPng(shop.logoUrl);
      if (kind === 'po') {
        await downloadPdf(<PurchaseOrderPDF order={po} shop={shop} logo={logo} />, `${po.poNumber}.pdf`);
      } else {
        await downloadPdf(
          <GoodsReceiptPDF receipt={receipt} order={po} shop={shop} logo={logo} />,
          `${receipt.receiptNumber}-${po.poNumber}.pdf`
        );
      }
    } catch (error) {
      console.error('PDF failed', error);
      toast.error('Could not make the PDF. Please try again.');
    } finally {
      setPrinting(null);
    }
  };

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
    if (activeLocations.length > 0 && !formData.locationId) return toast.error('Choose the store this order is for.');
    if (formData.items.length === 0) return toast.error('Add at least one item');

    // Strict validation
    for (const item of formData.items) {
      if (item.orderedQty <= 0) return toast.error(`Quantity must be > 0 for SKU: ${item.sku}`);
      if (item.unitPrice < 0) return toast.error(`Cost must be >= 0 for SKU: ${item.sku}`);
    }

    // Include grand total in submission payload (it can be computed on backend but good to have)
    const payload = {
      ...formData,
      // A shop with no store yet has nothing to choose; the order is raised without one.
      locationId: formData.locationId || null,
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

    if (!receiveLocationId) return toast.error('Choose where these goods are going.');

    if (receiverName.trim().length < 2) {
      document.getElementById('grn-receiver')?.focus();
      return toast.error('Enter the name of the person who received the goods.');
    }

    // Not blocked -- a warehouse taking a branch's delivery to send on is a real thing to do -- but
    // asked, because the usual reason is picking the wrong store, and nothing downstream notices:
    // the stock lands in the wrong place and the store that ran out stays empty and on alert.
    const orderedFor = po?.location;
    if (orderedFor?.active && receiveLocationId !== orderedFor.id) {
      const chosen = activeLocations.find(l => l.id === receiveLocationId);
      setConfirmState({
        isOpen: true,
        title: 'Receive into a different store?',
        message: `This order is for ${orderedFor.name}. Receive these goods into ${chosen?.name || 'the store you picked'} instead?

The stock will go into ${chosen?.name || 'that store'}. ${orderedFor.name} stays short, and its low-stock alerts stay open, until stock is moved there with a Transfer.`,
        confirmText: `Receive into ${chosen?.name || 'this store'}`,
        onConfirm: () => submitReceipt(receipts)
      });
      return;
    }

    await submitReceipt(receipts);
  };

  const submitReceipt = async (receipts) => {
    // A double click reaches here twice before the button can disable itself. The server
    // already turns the second into the same receipt, but each one also added the quantities to
    // the screen straight away -- so the line read "received 8" for a delivery of 4 until the
    // page refreshed, which looks exactly like a delivery booked twice.
    if (receiving.current) return;
    receiving.current = true;

    try {
      const result = await receiveGoods.mutateAsync({
        id, receipts,
        locationId: receiveLocationId,
        receivedByName: receiverName.trim(),
        receivedByPhone: receiverPhone.trim() || null,
        supplierReference: supplierReference.trim() || null,
        notes: receiveNotes.trim() || null,
        requestKey: requestKey.current
      });
      // The toast is handled by the hook now
      setLastReceipt(result?.receipt || null);
      requestKey.current = newKey();
      // The receiver is kept: the same person usually takes the next delivery too. The invoice
      // number and note belong to this one delivery and are cleared.
      setSupplierReference('');
      setReceiveNotes('');
      // Back to the order's own store: a delivery sent elsewhere is the exception, and the next one
      // should not quietly start from it.
      if (po?.location?.active) setReceiveLocationId(po.location.id);
      // Reset receiving quantities
      const initialRec = {};
      po.items.forEach(item => {
        initialRec[item.id] = 0;
      });
      setReceivingQuantities(initialRec);
    } catch (err) {
      // The toast is handled by the hook. The key is kept: pressing again after a failure that
      // did in fact save returns that receipt rather than a second one.
    } finally {
      receiving.current = false;
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
  // Where the supplier delivers: the store's own address, else the shop's (the same place for a
  // one-store shop). Nothing to send without a store -- the supplier would have to guess.
  const deliverTo = po?.location
    ? { name: po.location.name, address: po.location.address || branding?.businessAddress || null, phone: po.location.phone || branding?.businessPhone || null }
    : null;

  const whatsAppUrl = po && !isNew && deliverTo
    ? buildWhatsAppUrl(
        po.supplier?.phone,
        buildPurchaseOrderMessage({
          poNumber: po.poNumber,
          supplierName: po.supplier?.name,
          items: po.items || [],
          total: po.totalAmount ?? grandTotal,
          expectedDeliveryDate: po.expectedDeliveryDate,
          senderName: user?.name,
          deliverTo
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
  const canChangeDeliverTo = !isNew && po && po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && can('purchase_order:update');

  const saveDeliverTo = async (locationId) => {
    const result = await setDeliverTo.mutateAsync({ id, locationId });
    setDeliverToDraft(null);
    const name = result?.data?.location?.name;
    if (!result?.changed) return;
    if (result?.supplierAlreadyTold) {
      toast.success(`Now delivered to ${name}. Tell ${po?.supplier?.name || 'the supplier'} — they were sent this order for ${result.previous}.`, { duration: 8000 });
    } else {
      toast.success(`This order is now for ${name}.`);
    }
    // Receiving follows the order to its new store.
    setReceiveLocationId(locationId);
  };

  const requestDeliverToChange = () => {
    const chosen = activeLocations.find(l => l.id === deliverToDraft);
    if (!chosen) return toast.error('Choose a store.');
    // Once the order has gone out, the supplier has the old address. Said before, not after.
    if (po.location && po.status !== 'DRAFT' && chosen.id !== po.location.id) {
      setConfirmState({
        isOpen: true,
        title: 'Change where this order is delivered?',
        message: `${po.supplier?.name || 'The supplier'} was already sent this order for ${po.location.name}.

Change it to ${chosen.name}? The order will say ${chosen.name} from now on, but the supplier is not told automatically — call or message them.`,
        confirmText: `Deliver to ${chosen.name}`,
        onConfirm: () => saveDeliverTo(chosen.id)
      });
      return;
    }
    saveDeliverTo(chosen.id).catch(() => {});
  };

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
                  disabled={!supplierEmail || !deliverTo || emailPO.isPending}
                  className="btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: (!supplierEmail || !deliverTo || emailPO.isPending) ? 0.5 : 1,
                    cursor: (!supplierEmail || !deliverTo || emailPO.isPending) ? 'not-allowed' : 'pointer'
                  }}
                  title={
                    !deliverTo
                      ? 'Choose the store this order is for first, so the supplier knows where to deliver'
                      : supplierEmail
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
                      !deliverTo
                        ? 'Choose the store this order is for first, so the supplier knows where to deliver'
                        : po?.supplier?.phone
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

              <button
                onClick={() => printDocument('po')}
                disabled={printing === 'po'}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {printing === 'po' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {printing === 'po' ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Grid Layout */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }} className="mobile-stack-grid">

        {/* Left Column (Main Info) */}
        {/* minWidth 0: a grid column otherwise grows to fit its widest child, and the line items
            table made this one 443px on a 400px phone -- cutting off the right edge of everything
            in it instead of letting the table scroll inside its own box. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

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

          {/* Where the goods go. Chosen when the order is made; changeable until it is fully received. */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <MapPin size={18} style={{ color: 'var(--text-secondary)' }} />
              Deliver to
            </h2>
            {isNew ? (
              <div>
                <Select
                  className="input-field"
                  value={formData.locationId}
                  onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {activeLocations.length === 0 && <option value="">No stores yet</option>}
                  {activeLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
                  ))}
                </Select>
                <DeliverToAddress store={activeLocations.find(l => l.id === formData.locationId)} branding={branding} />
              </div>
            ) : deliverToDraft !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Select
                  className="input-field"
                  value={deliverToDraft}
                  onChange={e => setDeliverToDraft(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {!deliverToDraft && <option value="">Choose a store...</option>}
                  {activeLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
                  ))}
                </Select>
                <DeliverToAddress store={activeLocations.find(l => l.id === deliverToDraft)} branding={branding} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={requestDeliverToChange} disabled={!deliverToDraft || setDeliverTo.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {setDeliverTo.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                  </button>
                  <button className="btn-secondary" onClick={() => setDeliverToDraft(null)} disabled={setDeliverTo.isPending}>Cancel</button>
                </div>
              </div>
            ) : po?.location ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                  <div style={{ fontWeight: '600', fontSize: '18px', color: 'var(--text-primary)' }}>{po.location.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{po.location.code}</div>
                  <DeliverToAddress store={po.location} branding={branding} />
                  {!po.location.active && (
                    <div role="alert" style={{ marginTop: '10px', display: 'flex', gap: '6px', fontSize: '13px', color: 'var(--accent-warning, #f59e0b)' }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{po.location.name} is switched off, so goods cannot be received there.{canChangeDeliverTo ? ' Choose another store.' : ''}</span>
                    </div>
                  )}
                </div>
                {canChangeDeliverTo && (
                  <button className="btn-secondary" onClick={() => setDeliverToDraft(po.location.active ? po.location.id : '')} style={{ fontSize: '13px' }}>
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div role="alert" style={{ display: 'flex', gap: '6px', fontSize: '14px', color: 'var(--accent-warning, #f59e0b)', flex: '1 1 200px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>No store chosen for this order yet, so the supplier cannot be told where to deliver.</span>
                </div>
                {canChangeDeliverTo && (
                  <button className="btn-primary" onClick={() => setDeliverToDraft(activeLocations.find(l => l.id === currentLocation?.id)?.id || '')} style={{ fontSize: '13px' }}>
                    Choose store
                  </button>
                )}
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

          {/* Goods that arrived and are not on a shelf yet, where the last delivery went. */}
          {!isNew && po?.receipts?.length > 0 && (
            <PutAwayNotice locationId={po.receipts[po.receipts.length - 1]?.locationId || po.locationId} variantIds={(po.items || []).map(i => i.variantId)} what="this order"
              quantities={Object.fromEntries((po.items || []).map(i => [i.variantId, Number(i.receivedQty ?? i.quantityReceived ?? 0)]))} />
          )}

          {/* Every delivery against this order, each with its own goods receipt. */}
          {!isNew && po?.receipts?.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                Deliveries received
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...po.receipts].reverse().map(receipt => {
                  const pieces = (receipt.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                  return (
                    <div key={receipt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 14px', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {receipt.receiptNumber}
                          <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> · {pieces} piece{pieces === 1 ? '' : 's'} into {receipt.location?.name || '—'}</span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px', overflowWrap: 'anywhere' }}>
                          {new Date(receipt.receivedAt).toLocaleString()}
                          {receipt.receivedByName ? ` · received by ${receipt.receivedByName}` : ''}
                          {receipt.supplierReference ? ` · invoice ${receipt.supplierReference}` : ''}
                        </div>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => printDocument('receipt', receipt)}
                        disabled={printing === receipt.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                        aria-label={`Download goods receipt ${receipt.receiptNumber}`}
                      >
                        {printing === receipt.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Receipt PDF
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
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
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Enter how many of each item arrived in the table, then confirm. You get a receipt to print or send.
              </p>

              <label className="form-label" htmlFor="grn-location" style={{ display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>Receive into</label>
              <Select
                id="grn-location"
                className="input-field"
                value={receiveLocationId}
                onChange={e => setReceiveLocationId(e.target.value)}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {activeLocations.length === 0 && <option value="">No locations</option>}
                {activeLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}{l.id === po?.locationId ? ' — this order' : ''}</option>
                ))}
              </Select>
              {po?.location && receiveLocationId && receiveLocationId !== po.location.id && (
                <p role="status" style={{ margin: '-4px 0 12px', fontSize: '12.5px', color: 'var(--accent-warning, #f59e0b)', display: 'flex', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{po.location.active ? `This order is for ${po.location.name}.` : `This order was for ${po.location.name}, which is switched off.`}</span>
                </p>
              )}

              <label className="form-label" htmlFor="grn-receiver" style={{ display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>
                Received by <span style={{ color: 'var(--accent-danger)' }} aria-hidden="true">*</span>
              </label>
              <input
                id="grn-receiver"
                className="input-field"
                value={receiverName}
                maxLength={80}
                required
                aria-required="true"
                autoComplete="name"
                onChange={e => setReceiverName(e.target.value)}
                placeholder="Name of the person who took the goods"
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label className="form-label" htmlFor="grn-receiver-phone" style={{ display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>Receiver's phone (optional)</label>
              <input
                id="grn-receiver-phone"
                className="input-field"
                type="tel"
                inputMode="tel"
                value={receiverPhone}
                maxLength={20}
                onChange={e => setReceiverPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label className="form-label" htmlFor="grn-reference" style={{ display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>Supplier invoice / challan no. (optional)</label>
              <input
                id="grn-reference"
                className="input-field"
                value={supplierReference}
                maxLength={80}
                onChange={e => setSupplierReference(e.target.value)}
                placeholder="e.g. INV-2291"
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label className="form-label" htmlFor="grn-notes" style={{ display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>Note (optional)</label>
              <textarea
                id="grn-notes"
                className="input-field"
                value={receiveNotes}
                maxLength={500}
                rows={2}
                onChange={e => setReceiveNotes(e.target.value)}
                placeholder="e.g. 2 pieces had damaged packaging"
                style={{ width: '100%', marginBottom: '16px', resize: 'vertical' }}
              />

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

          {/* The receipt just made, straight to hand -- including after the last delivery, when
              the order is fully received and the panel above has gone. */}
          {lastReceipt && (
            <div className="glass-panel" role="status" style={{ padding: '20px', borderColor: 'var(--accent-success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                <CheckCircle2 size={18} color="var(--accent-success)" /> {lastReceipt.receiptNumber} saved
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                {(() => {
                  const pieces = (lastReceipt.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                  return `${pieces} piece${pieces === 1 ? '' : 's'} into ${lastReceipt.location?.name || 'stock'}.`;
                })()}
              </p>
              <button
                className="btn-primary"
                onClick={() => printDocument('receipt', lastReceipt)}
                disabled={printing === lastReceipt.id}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {printing === lastReceipt.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download receipt PDF
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

/**
 * The delivery address under a store: its own when saved, else the shop's letterhead address (the
 * same place for a one-store shop). Says so when neither exists, since that is what a supplier
 * will be sent.
 */
function DeliverToAddress({ store, branding }) {
  if (!store) return null;
  const address = store.address || branding?.businessAddress;
  const phone = store.phone || branding?.businessPhone;
  return (
    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
      {address ? <div>{address}</div> : <div style={{ color: 'var(--text-muted)' }}>No address saved for this store. Add one in Settings, Stock Locations.</div>}
      {phone && <div>Phone {phone}</div>}
      {!store.address && address && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>The shop's address, as this store has none of its own.</div>}
    </div>
  );
}
