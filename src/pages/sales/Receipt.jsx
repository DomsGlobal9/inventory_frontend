import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useReceipt } from '../../hooks/useCounterSale';
import WhatsAppSendButton from '../../components/whatsapp/WhatsAppSendButton';
import BillPDF from '../../components/BillPDF';
import { makePdf } from '../../components/pdf/downloadPdf';
import { logoAsPng } from '../../components/pdf/pdfLogo';

/**
 * The 80 mm receipt.
 *
 * A web page printed through the browser rather than a PDF: it works with whatever thermal printer
 * the computer already has, and it prints ₹ and Telugu names properly, which the PDF fonts cannot.
 *
 * The paper is always black on white whatever the app's theme -- it is paper.
 *
 * "DUPLICATE" on every print except the one made straight from the sale, so a reprint handed over
 * later cannot pass for a second purchase.
 */

const money = (v) => Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const METHOD = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', POINTS: 'Loyalty points' };
const ORIGINAL_WINDOW_MS = 10 * 60_000;

export default function Receipt() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError, error } = useReceipt(id);
  const printed = useRef(false);

  const original = params.get('fresh') === '1' && sale && Date.now() - new Date(sale.createdAt).getTime() < ORIGINAL_WINDOW_MS;
  /*
   * Only a sale made at the counter has a receipt. No button leads here for an online or Shopify
   * order, but the address did, and it printed a till receipt for an order the shop never rang up
   * -- ending "Due 12,980.00" for an order paid elsewhere.
   */
  const notCounter = !!sale && sale.atCounter === false;

  useEffect(() => {
    if (sale && !notCounter && params.get('print') === '1' && !printed.current) {
      printed.current = true;
      // A moment for the logo to arrive, or it prints as an empty box.
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [sale, notCounter, params]);

  useEffect(() => {
    if (sale && !notCounter) document.title = `Receipt ${sale.orderNumber}`;
  }, [sale, notCounter]);

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (isError || !sale) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>{error?.message || 'Receipt not found.'}</div>;
  if (notCounter) {
    return (
      <div style={{ padding: 48, display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>
          Receipts are only for sales made at the counter with New sale. Order {sale.orderNumber} was not sold at the counter.
        </p>
        <button className="btn-secondary" onClick={() => navigate(`/orders/${sale.id}`)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <ArrowLeft size={15} /> Back to the order
        </button>
      </div>
    );
  }

  const when = new Date(sale.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const payments = sale.payments.filter(p => p.kind === 'PAYMENT');
  const change = payments.reduce((s, p) => s + (p.changeGiven || 0), 0);
  const Row = ({ left, right, bold, small }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: bold ? 700 : 400, fontSize: small ? 11 : 12 }}>
      <span style={{ minWidth: 0 }}>{left}</span><span style={{ whiteSpace: 'nowrap' }}>{right}</span>
    </div>
  );

  return (
    <div className="receipt-page">
      <style>{`
        .receipt-page { min-height: 100vh; background: var(--bg-dark); padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .receipt-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: flex-start; }
        .receipt-paper { width: 80mm; max-width: 100%; box-sizing: border-box; background: #fff; color: #000; padding: 4mm; font-family: 'Courier New', ui-monospace, monospace; line-height: 1.35; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
        .receipt-paper hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { background: #fff !important; }
          .receipt-page { background: #fff; padding: 0; min-height: 0; }
          .receipt-actions { display: none !important; }
          .receipt-paper { box-shadow: none; width: 80mm; }
        }
      `}</style>

      <div className="receipt-actions">
        <button className="btn-secondary" onClick={() => navigate(`/orders/${sale.id}`)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={15} /> Order</button>
        <button className="btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Printer size={15} /> Print</button>
        {/* The bill as a PDF, straight to the customer from the shop's WhatsApp. */}
        <WhatsAppSendButton
          kind="BILL"
          id={sale.id}
          permission="sales_order:view"
          fileName={`Bill-${sale.orderNumber}.pdf`}
          recipientLabel={sale.customer?.name}
          buildPdf={async () => makePdf(<BillPDF sale={sale} logo={await logoAsPng(sale.shop?.logoUrl)} />)}
        />
      </div>

      <div className="receipt-paper">
        <div style={{ textAlign: 'center', display: 'grid', gap: 2 }}>
          {sale.shop.logoUrl && <img src={sale.shop.logoUrl} alt="" style={{ maxHeight: 48, maxWidth: '60%', margin: '0 auto 4px', filter: 'grayscale(1)' }} />}
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sale.shop.name || sale.store?.name}</div>
          {sale.shop.address && <div style={{ fontSize: 11, whiteSpace: 'pre-line' }}>{sale.shop.address}</div>}
          {sale.shop.phone && <div style={{ fontSize: 11 }}>Ph {sale.shop.phone}</div>}
          {sale.shop.gstNumber && <div style={{ fontSize: 11 }}>GSTIN {sale.shop.gstNumber}</div>}
          {!original && <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, letterSpacing: 2 }}>DUPLICATE</div>}
        </div>
        <hr />
        <Row left={`Bill ${sale.orderNumber}`} right={when} small />
        {/* On its own line: a long name beside the store squeezed the store into three lines. */}
        <Row left={`Store ${sale.store?.name ?? ''}`} right="" small />
        {sale.soldBy && <Row left={`Sold by ${sale.soldBy}`} right="" small />}
        {sale.customer?.name && <Row left={`Customer ${sale.customer.name}`} right={sale.customer.phoneMasked || ''} small />}
        <hr />
        {sale.items.map(item => (
          <div key={item.id} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12 }}>{[item.title, item.colorName, item.size].filter(Boolean).join(', ')}</div>
            <Row left={`  ${item.quantity} × ${money(item.listUnitPrice)}`} right={money(item.listUnitPrice * item.quantity)} />
            {item.discounts.filter(d => d.amount > 0).map((d, i) => (
              <Row key={i} left={`  ${d.title}`} right={`-${money(d.amount)}`} small />
            ))}
          </div>
        ))}
        <hr />
        {/* An order with tax or shipping on top (Shopify, online) has to show them, or its lines do
            not add up to its total. A counter sale has neither: its shelf prices include GST. */}
        {(sale.taxAmount > 0 || sale.shippingAmount > 0) && (
          <>
            <Row left="Items" right={money(sale.subtotal - (sale.discountAmount || 0))} small />
            {sale.taxAmount > 0 && <Row left="Tax" right={money(sale.taxAmount)} small />}
            {sale.shippingAmount > 0 && <Row left="Shipping" right={money(sale.shippingAmount)} small />}
          </>
        )}
        <Row left="Total" right={`₹${money(sale.total)}`} bold />
        {payments.map(p => (
          <Row key={p.id} left={`Paid ${METHOD[p.method]}${p.cashReceived ? ` (got ${money(p.cashReceived)})` : ''}${p.reference && p.method !== 'CASH' ? ` ${p.method === 'CARD' ? '••' : ''}${p.reference}` : ''}`} right={money(p.amount)} small />
        ))}
        {change > 0 && <Row left="Change" right={money(change)} small />}
        {sale.payment.due > 0 && <Row left="Due" right={money(sale.payment.due)} bold />}
        <hr />
        <div style={{ textAlign: 'center', fontSize: 11, display: 'grid', gap: 2 }}>
          {!(sale.taxAmount > 0) && <div>Prices include GST.</div>}
          {sale.shop.receiptFooter && <div style={{ whiteSpace: 'pre-line' }}>{sale.shop.receiptFooter}</div>}
          <div>Thank you!</div>
        </div>
      </div>
    </div>
  );
}
