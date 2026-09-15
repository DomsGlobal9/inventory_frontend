import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Letterhead, LetterheadFooter, pdfStyles as s, rupees, printDate } from './pdf/Letterhead';

/**
 * A purchase order on the shop's letterhead.
 *
 * `shop` is the branding (name, address, phone, email, GSTIN) and `logo` a PNG data URL -- see
 * pdf/Letterhead. It used to print a made-up company and address for every shop on the platform.
 */

const COLS = { n: '5%', item: '47%', qty: '12%', price: '17%', total: '19%' };

const STATUS = {
  DRAFT: 'Draft', SENT: 'Sent', PARTIALLY_RECEIVED: 'Partly received', RECEIVED: 'Received', CANCELLED: 'Cancelled'
};

const PurchaseOrderPDF = ({ order, shop = {}, logo = null }) => {
  if (!order) return null;

  const supplier = order.supplier || {};
  const items = order.items || [];
  const total = items.reduce((sum, item) => sum + (Number(item.orderedQty) || 0) * (Number(item.unitPrice) || 0), 0);
  const pieces = items.reduce((sum, item) => sum + (Number(item.orderedQty) || 0), 0);

  return (
    <Document title={`${order.poNumber} ${shop.businessName || ''}`.trim()} author={shop.businessName || undefined}>
      <Page size="A4" style={s.page}>
        <Letterhead
          shop={shop}
          logo={logo}
          title="PURCHASE ORDER"
          number={order.poNumber}
          meta={[
            ['Date', printDate(order.createdAt)],
            ['Deliver by', order.expectedDeliveryDate ? printDate(order.expectedDeliveryDate) : null],
            ['Status', STATUS[order.status] || order.status]
          ]}
        />

        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.boxTitle}>Supplier</Text>
            <Text style={s.boxName}>{supplier.name || '—'}</Text>
            {supplier.supplierCode ? <Text style={s.boxLine}>Code: {supplier.supplierCode}</Text> : null}
            {supplier.address ? <Text style={s.boxLine}>{supplier.address}</Text> : null}
            {supplier.phone ? <Text style={s.boxLine}>{supplier.phone}</Text> : null}
            {supplier.email ? <Text style={s.boxLine}>{supplier.email}</Text> : null}
          </View>
          <View style={s.boxGap} />
          <View style={s.box}>
            <Text style={s.boxTitle}>Bill to</Text>
            <Text style={s.boxName}>{shop.businessName || '—'}</Text>
            {shop.businessAddress ? <Text style={s.boxLine}>{shop.businessAddress}</Text> : null}
            {shop.gstNumber ? <Text style={s.boxLine}>GSTIN: {shop.gstNumber}</Text> : null}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.headRow} fixed>
            <Text style={[s.th, { width: COLS.n }]}>#</Text>
            <Text style={[s.th, { width: COLS.item }]}>Item</Text>
            <Text style={[s.th, s.right, { width: COLS.qty }]}>Qty</Text>
            <Text style={[s.th, s.right, { width: COLS.price }]}>Unit price</Text>
            <Text style={[s.th, s.right, { width: COLS.total }]}>Amount</Text>
          </View>
          {items.map((item, index) => {
            const qty = Number(item.orderedQty) || 0;
            const price = Number(item.unitPrice) || 0;
            const variant = [item.color, item.size].filter(Boolean).join(' / ');
            const codes = [item.sku, item.supplierSku ? `Supplier code ${item.supplierSku}` : null].filter(Boolean).join('   ·   ');
            return (
              <View style={s.row} key={item.id || index} wrap={false}>
                <Text style={[s.td, { width: COLS.n }]}>{index + 1}</Text>
                <View style={{ width: COLS.item, paddingRight: 8 }}>
                  <Text style={s.td}>{item.productTitle}{variant ? ` — ${variant}` : ''}</Text>
                  <Text style={s.sub}>{codes}</Text>
                </View>
                <Text style={[s.td, s.right, { width: COLS.qty }]}>{qty}</Text>
                <Text style={[s.td, s.right, { width: COLS.price }]}>{rupees(price)}</Text>
                <Text style={[s.td, s.right, { width: COLS.total }]}>{rupees(qty * price)}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={{ color: '#6b7280' }}>Items</Text>
            <Text>{items.length} lines · {pieces} pieces</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grand}>Total</Text>
            <Text style={s.grand}>{rupees(total)}</Text>
          </View>
        </View>

        {order.notes ? (
          <View style={s.note} wrap={false}>
            <Text style={s.noteTitle}>Notes</Text>
            <Text>{order.notes}</Text>
          </View>
        ) : null}

        <View style={s.note} wrap={false}>
          <Text style={s.noteTitle}>For the supplier</Text>
          <Text>Please quote {order.poNumber} on your invoice and delivery challan.{shop.businessPhone || shop.businessEmail ? ` Questions: ${[shop.businessPhone, shop.businessEmail].filter(Boolean).join(' or ')}.` : ''}</Text>
        </View>

        <View style={s.signatures} wrap={false}>
          <View style={s.signature}><Text style={s.signatureLabel}>Authorised signatory, {shop.businessName || 'the buyer'}</Text></View>
          <View style={[s.signature, { marginRight: 0 }]}><Text style={s.signatureLabel}>Accepted by the supplier</Text></View>
        </View>

        <LetterheadFooter shop={shop} label={`Purchase order ${order.poNumber}`} />
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDF;
