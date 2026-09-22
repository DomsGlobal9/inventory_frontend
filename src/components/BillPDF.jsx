import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Letterhead, LetterheadFooter, pdfStyles as s, rupees, printDate } from './pdf/Letterhead';

/**
 * A counter sale's bill, as a PDF: what Send on WhatsApp gives the customer.
 *
 * The printed 80 mm receipt stays a web page (it prints ₹ and Telugu names, which the PDF fonts
 * cannot). This is the same sale in the shop's letterhead, built from the same receipt data, so
 * the two never disagree: every line, every discount with its reason, the payments and the change.
 * Money is written "Rs." -- Helvetica has no rupee sign.
 */

const METHOD = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', POINTS: 'Loyalty points', CREDIT: 'Store credit' };
const COLS = { n: '5%', item: '47%', qty: '10%', price: '19%', value: '19%' };

const BillPDF = ({ sale, logo = null }) => {
  if (!sale) return null;
  const shop = {
    businessName: sale.shop?.name || sale.store?.name,
    businessAddress: sale.shop?.address,
    businessPhone: sale.shop?.phone,
    gstNumber: sale.shop?.gstNumber
  };
  const payments = (sale.payments || []).filter(p => p.kind === 'PAYMENT');
  const refunds = (sale.payments || []).filter(p => p.kind === 'REFUND');
  const change = payments.reduce((sum, p) => sum + (Number(p.changeGiven) || 0), 0);

  return (
    <Document title={`Bill ${sale.orderNumber}`} author={shop.businessName || undefined}>
      <Page size="A4" style={s.page}>
        <Letterhead
          shop={shop}
          logo={logo}
          title="BILL"
          number={sale.orderNumber}
          meta={[
            ['Date', printDate(sale.createdAt, true)],
            ['Store', sale.store?.name],
            ['Sold by', sale.soldBy]
          ]}
        />

        {sale.customer?.name ? (
          <View style={s.boxes}>
            <View style={s.box}>
              <Text style={s.boxTitle}>Customer</Text>
              <Text style={s.boxName}>{sale.customer.name}</Text>
              {sale.customer.phoneMasked ? <Text style={s.boxLine}>{sale.customer.phoneMasked}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={s.table}>
          <View style={s.headRow} fixed>
            <Text style={[s.th, { width: COLS.n }]}>#</Text>
            <Text style={[s.th, { width: COLS.item }]}>Item</Text>
            <Text style={[s.th, s.right, { width: COLS.qty }]}>Qty</Text>
            <Text style={[s.th, s.right, { width: COLS.price }]}>Price</Text>
            <Text style={[s.th, s.right, { width: COLS.value }]}>Amount</Text>
          </View>
          {(sale.items || []).map((item, index) => {
            const variant = [item.colorName, item.size].filter(Boolean).join(' / ');
            const gross = (Number(item.listUnitPrice) || 0) * (Number(item.quantity) || 0);
            return (
              <View style={s.row} key={item.id || index} wrap={false}>
                <Text style={[s.td, { width: COLS.n }]}>{index + 1}</Text>
                <View style={{ width: COLS.item, paddingRight: 6 }}>
                  <Text style={s.td}>{item.title}{variant ? ` — ${variant}` : ''}</Text>
                  {(item.discounts || []).filter(d => d.amount > 0).map((d, i) => (
                    <Text key={i} style={s.sub}>{d.title}: -{rupees(d.amount)}</Text>
                  ))}
                </View>
                <Text style={[s.td, s.right, { width: COLS.qty }]}>{item.quantity}</Text>
                <Text style={[s.td, s.right, { width: COLS.price }]}>{rupees(item.listUnitPrice)}</Text>
                <Text style={[s.td, s.right, { width: COLS.value }]}>{rupees(gross)}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.totals} wrap={false}>
          {sale.discountAmount > 0 ? (
            <View style={s.totalRow}>
              <Text style={{ color: '#6b7280' }}>Discounts</Text>
              <Text>-{rupees(sale.discountAmount)}</Text>
            </View>
          ) : null}
          {sale.taxAmount > 0 ? (
            <View style={s.totalRow}><Text style={{ color: '#6b7280' }}>Tax</Text><Text>{rupees(sale.taxAmount)}</Text></View>
          ) : null}
          {sale.shippingAmount > 0 ? (
            <View style={s.totalRow}><Text style={{ color: '#6b7280' }}>Shipping</Text><Text>{rupees(sale.shippingAmount)}</Text></View>
          ) : null}
          <View style={s.grandRow}>
            <Text style={s.grand}>Total</Text>
            <Text style={s.grand}>{rupees(sale.total)}</Text>
          </View>
          {payments.map(p => (
            <View style={s.totalRow} key={p.id}>
              <Text style={{ color: '#6b7280' }}>{p.kind === 'REFUND' ? 'Paid back by' : 'Paid by'} {METHOD[p.method] || p.method}</Text>
              <Text>{p.kind === 'REFUND' ? `-${rupees(p.amount)}` : rupees(p.amount)}</Text>
            </View>
          ))}
          {change > 0 ? (
            <View style={s.totalRow}><Text style={{ color: '#6b7280' }}>Change given</Text><Text>{rupees(change)}</Text></View>
          ) : null}
          {refunds.map(p => (
            <View style={s.totalRow} key={p.id}>
              <Text style={{ color: '#6b7280' }}>Paid back on a return, by {METHOD[p.method] || p.method}</Text>
              <Text>-{rupees(p.amount)}</Text>
            </View>
          ))}
          {sale.payment?.due > 0 ? (
            <View style={s.totalRow}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Still to pay</Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{rupees(sale.payment.due)}</Text></View>
          ) : null}
        </View>

        <Text style={{ marginTop: 18, fontSize: 9, color: '#6b7280' }}>
          {!(sale.taxAmount > 0) ? 'Prices include GST. ' : ''}{sale.shop?.receiptFooter || ''}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 10 }}>Thank you!</Text>

        <LetterheadFooter shop={shop} label={`Bill ${sale.orderNumber}`} />
      </Page>
    </Document>
  );
};

export default BillPDF;
