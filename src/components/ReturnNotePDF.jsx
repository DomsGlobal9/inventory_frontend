import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Letterhead, LetterheadFooter, pdfStyles as s, rupees, printDate } from './pdf/Letterhead';
import { RETURN_DISPOSITION, describe, returnReasonLabel } from './sales/labels';

/**
 * A finished return, as a PDF for the customer: what came back, what the shop decided for each
 * piece, and what is owed back -- the price actually paid, after offers and till discounts, as
 * the return page shows it. Money is written "Rs." (Helvetica has no rupee sign).
 */

const COLS = { n: '5%', item: '45%', qty: '10%', what: '20%', value: '20%' };

const ReturnNotePDF = ({ ret, shop = {}, logo = null }) => {
  if (!ret) return null;
  const order = ret.salesOrder || {};
  const customer = order.customer || {};
  const refunded = ret.status !== 'REJECTED' && Number(ret.refundTotal || 0) > 0;

  return (
    <Document title={`Return ${ret.returnNumber}`} author={shop.businessName || undefined}>
      <Page size="A4" style={s.page}>
        <Letterhead
          shop={shop}
          logo={logo}
          title="RETURN NOTE"
          number={ret.returnNumber}
          meta={[
            ['Order', order.orderNumber],
            ['Completed', ret.completedAt ? printDate(ret.completedAt, true) : null],
            ['Reason', ret.reason ? returnReasonLabel(ret.reason) : null]
          ]}
        />

        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.boxTitle}>Customer</Text>
            <Text style={s.boxName}>{customer.name || '—'}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.headRow} fixed>
            <Text style={[s.th, { width: COLS.n }]}>#</Text>
            <Text style={[s.th, { width: COLS.item }]}>Item</Text>
            <Text style={[s.th, s.right, { width: COLS.qty }]}>Qty</Text>
            <Text style={[s.th, { width: COLS.what, paddingLeft: 8 }]}>Outcome</Text>
            <Text style={[s.th, s.right, { width: COLS.value }]}>Refund</Text>
          </View>
          {(ret.items || []).map((item, index) => {
            const variant = item.dispatchItem?.salesOrderItem?.variant;
            return (
              <View style={s.row} key={item.id || index} wrap={false}>
                <Text style={[s.td, { width: COLS.n }]}>{index + 1}</Text>
                <View style={{ width: COLS.item, paddingRight: 6 }}>
                  <Text style={s.td}>{variant?.product?.title || 'Item'}</Text>
                  {variant?.sku ? <Text style={s.sub}>{variant.sku}</Text> : null}
                </View>
                <Text style={[s.td, s.right, { width: COLS.qty }]}>{item.quantity}</Text>
                <Text style={[s.td, { width: COLS.what, paddingLeft: 8 }]}>{describe(RETURN_DISPOSITION, item.disposition).label}</Text>
                <Text style={[s.td, s.right, { width: COLS.value }]}>{rupees(item.refundAmount || 0)}</Text>
              </View>
            );
          })}
        </View>

        {refunded ? (
          <View style={s.totals} wrap={false}>
            <View style={s.grandRow}>
              <Text style={s.grand}>Owed back to you</Text>
              <Text style={s.grand}>{rupees(ret.refundTotal)}</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>What you paid for these items, after discounts.</Text>
          </View>
        ) : null}

        <LetterheadFooter shop={shop} label={`Return ${ret.returnNumber} against ${order.orderNumber || ''}`} />
      </Page>
    </Document>
  );
};

export default ReturnNotePDF;
