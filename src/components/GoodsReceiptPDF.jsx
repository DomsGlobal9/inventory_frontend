import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Letterhead, LetterheadFooter, pdfStyles as s, rupees, printDate } from './pdf/Letterhead';

/**
 * A goods receipt note: what arrived in one delivery against a purchase order.
 *
 * The paper a shop hands back to the driver and files with the supplier's bill. Built entirely
 * from the receipt's own record -- each line kept what it was measured against when it arrived
 * (ordered, already received) -- so a receipt printed months later reads as it did on the day,
 * not as the purchase order stands now.
 */

// Still due is wide enough for "Complete", and money columns for a lakh with paise -- at the old
// widths "Complete" ran straight into "Rs. 10,250.50" with no space between them.
const COLS = { n: '4%', item: '30%', ordered: '9%', before: '8%', now: '9%', due: '12%', cost: '14%', value: '14%' };

const GoodsReceiptPDF = ({ receipt, order, shop = {}, logo = null }) => {
  if (!receipt || !order) return null;

  const supplier = order.supplier || {};
  const items = receipt.items || [];
  const pieces = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const value = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const stillDue = items.reduce(
    (sum, i) => sum + Math.max(0, (Number(i.orderedQty) || 0) - (Number(i.receivedBefore) || 0) - (Number(i.quantity) || 0)), 0
  );
  const location = receipt.location
    ? `${receipt.location.name}${receipt.location.code ? ` (${receipt.location.code})` : ''}`
    : '—';

  return (
    <Document title={`${receipt.receiptNumber} ${shop.businessName || ''}`.trim()} author={shop.businessName || undefined}>
      <Page size="A4" style={s.page}>
        <Letterhead
          shop={shop}
          logo={logo}
          title="GOODS RECEIPT NOTE"
          number={receipt.receiptNumber}
          meta={[
            ['Received', printDate(receipt.receivedAt, true)],
            ['Purchase order', order.poNumber],
            ['Supplier invoice / challan', receipt.supplierReference]
          ]}
        />

        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.boxTitle}>Received from</Text>
            <Text style={s.boxName}>{supplier.name || '—'}</Text>
            {supplier.supplierCode ? <Text style={s.boxLine}>Code: {supplier.supplierCode}</Text> : null}
            {supplier.address ? <Text style={s.boxLine}>{supplier.address}</Text> : null}
            {[supplier.phone, supplier.email].filter(Boolean).length ? <Text style={s.boxLine}>{[supplier.phone, supplier.email].filter(Boolean).join('   ·   ')}</Text> : null}
          </View>
          <View style={s.boxGap} />
          <View style={s.box}>
            <Text style={s.boxTitle}>Received into</Text>
            <Text style={s.boxName}>{location}</Text>
            {/* The receiver as typed at the door -- never the login that entered the receipt. */}
            <Text style={s.boxLine}>Received by {receipt.receivedByName || '—'}{receipt.receivedByPhone ? `  ·  ${receipt.receivedByPhone}` : ''}</Text>
            <Text style={s.boxLine}>Order placed {printDate(order.createdAt, true)}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.headRow} fixed>
            <Text style={[s.th, { width: COLS.n }]}>#</Text>
            <Text style={[s.th, { width: COLS.item }]}>Item</Text>
            <Text style={[s.th, s.right, { width: COLS.ordered }]}>Ordered</Text>
            <Text style={[s.th, s.right, { width: COLS.before }]}>Earlier</Text>
            <Text style={[s.th, s.right, { width: COLS.now }]}>This time</Text>
            <Text style={[s.th, s.right, { width: COLS.due }]}>Still due</Text>
            <Text style={[s.th, s.right, { width: COLS.cost }]}>Unit cost</Text>
            <Text style={[s.th, s.right, { width: COLS.value }]}>Value</Text>
          </View>
          {items.map((item, index) => {
            const now = Number(item.quantity) || 0;
            const before = Number(item.receivedBefore) || 0;
            const ordered = Number(item.orderedQty) || 0;
            const due = Math.max(0, ordered - before - now);
            const variant = [item.color, item.size].filter(Boolean).join(' / ');
            return (
              <View style={s.row} key={item.id || index} wrap={false}>
                <Text style={[s.td, { width: COLS.n }]}>{index + 1}</Text>
                <View style={{ width: COLS.item, paddingRight: 6 }}>
                  <Text style={s.td}>{item.productTitle}{variant ? ` — ${variant}` : ''}</Text>
                  <Text style={s.sub}>{item.sku}</Text>
                </View>
                <Text style={[s.td, s.right, { width: COLS.ordered }]}>{ordered}</Text>
                <Text style={[s.td, s.right, { width: COLS.before }]}>{before}</Text>
                <Text style={[s.td, s.right, { width: COLS.now, fontFamily: 'Helvetica-Bold' }]}>{now}</Text>
                <Text style={[s.td, s.right, { width: COLS.due }]}>{due === 0 ? 'Complete' : due}</Text>
                <Text style={[s.td, s.right, { width: COLS.cost, paddingLeft: 6 }]}>{rupees(item.unitPrice)}</Text>
                <Text style={[s.td, s.right, { width: COLS.value }]}>{rupees(now * (Number(item.unitPrice) || 0))}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={{ color: '#6b7280' }}>Pieces received</Text>
            <Text>{pieces}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={{ color: '#6b7280' }}>Still due on these lines</Text>
            <Text>{stillDue}</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grand}>Value received</Text>
            <Text style={s.grand}>{rupees(value)}</Text>
          </View>
        </View>

        {receipt.notes ? (
          <View style={s.note} wrap={false}>
            <Text style={s.noteTitle}>Notes</Text>
            <Text>{receipt.notes}</Text>
          </View>
        ) : null}

        <Text style={{ marginTop: 14, fontSize: 8, color: '#6b7280' }}>
          Lines of {order.poNumber} that did not arrive in this delivery are not listed.
        </Text>

        <View style={s.signatures} wrap={false}>
          <View style={s.signature}>
            <Text style={s.signatureLabel}>Received by{receipt.receivedByName ? `: ${receipt.receivedByName}` : ''}</Text>
          </View>
          <View style={s.signature}><Text style={s.signatureLabel}>Checked by</Text></View>
          <View style={[s.signature, { marginRight: 0 }]}><Text style={s.signatureLabel}>Delivered by (supplier)</Text></View>
        </View>

        <LetterheadFooter shop={shop} label={`Goods receipt ${receipt.receiptNumber} against ${order.poNumber}`} />
      </Page>
    </Document>
  );
};

export default GoodsReceiptPDF;
