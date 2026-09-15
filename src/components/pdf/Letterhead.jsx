import React from 'react';
import { View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

/**
 * The shop's letterhead, for every document it sends out.
 *
 * The purchase order used to print "ScaleEzy Boutiques Ltd., 123 Commerce Way, Warehouse
 * District, TX 75001" for every shop on the platform. This prints the shop's own name, logo,
 * address, phone, email and GSTIN from Settings, leaving out whatever has not been filled in.
 *
 * Helvetica, like the other PDFs here: it has no rupee glyph (money prints as "Rs.") and no
 * Indian scripts, so an address typed in Telugu or Hindi will not render. Registering a font
 * that covers them would mean loading it from outside the app on every document.
 */

export const INK = '#1f2328';
export const MUTED = '#6b7280';
export const RULE = '#e5e7eb';
export const ACCENT = '#b8860b';

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 80, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9.5, color: INK },
  letterhead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: ACCENT, marginBottom: 18 },
  shop: { flexDirection: 'row', alignItems: 'flex-start', flexGrow: 1, flexShrink: 1, paddingRight: 16 },
  logo: { width: 60, height: 60, objectFit: 'contain', marginRight: 12 },
  shopName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  shopLine: { fontSize: 8.5, color: MUTED, marginBottom: 1.5, maxWidth: 260 },
  doc: { alignItems: 'flex-end', minWidth: 170 },
  docTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6, marginBottom: 3 },
  docNumber: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: ACCENT, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 1.5 },
  metaLabel: { fontSize: 8.5, color: MUTED, marginRight: 4 },
  metaValue: { fontSize: 8.5 },

  boxes: { flexDirection: 'row', marginBottom: 16 },
  box: { flexGrow: 1, flexBasis: 0, backgroundColor: '#f8f8f6', borderRadius: 3, padding: 10 },
  boxGap: { width: 12 },
  boxTitle: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  boxName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  boxLine: { fontSize: 8.5, color: '#374151', marginBottom: 1.5 },

  table: { borderTopWidth: 1, borderTopColor: INK },
  headRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingVertical: 5 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 5 },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#374151' },
  td: { fontSize: 9 },
  sub: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  right: { textAlign: 'right' },

  totals: { alignSelf: 'flex-end', width: 220, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 5 },
  grand: { fontSize: 11, fontFamily: 'Helvetica-Bold' },

  note: { marginTop: 16, padding: 10, borderLeftWidth: 2, borderLeftColor: ACCENT, backgroundColor: '#fbfaf5' },
  noteTitle: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },

  signatures: { flexDirection: 'row', marginTop: 42 },
  signature: { flexGrow: 1, flexBasis: 0, borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 4, marginRight: 24 },
  signatureLabel: { fontSize: 8, color: MUTED },

  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: MUTED },
  poweredBy: { marginTop: 5, fontSize: 7, color: MUTED, textAlign: 'center', letterSpacing: 0.2 },
  poweredByBrand: { fontFamily: 'Helvetica-Bold', color: ACCENT }
});

// Words are never split across lines. The default hyphenation broke an email address as
// "orders@parvathihand-" / "looms.in", which is a different, wrong address on paper.
Font.registerHyphenationCallback(word => [word]);

/**
 * "Rs. 1,23,456.50" -- Indian grouping, always two decimals, so a money column lines up and
 * never reads "Rs. 12,505" beside "Rs. 14,855.50".
 */
export function rupees(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function printDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : date;
}

/**
 * @param shop   branding: businessName, businessAddress, businessPhone, businessEmail, gstNumber
 * @param logo   PNG data URL from logoAsPng, or null
 * @param title  e.g. "PURCHASE ORDER"
 * @param number e.g. "PO-000123"
 * @param meta   [label, value] pairs printed under the number; empty values are skipped
 */
export function Letterhead({ shop = {}, logo, title, number, meta = [] }) {
  const contact = [shop.businessPhone, shop.businessEmail].filter(Boolean).join('   ·   ');
  return (
    <View style={pdfStyles.letterhead} fixed>
      <View style={pdfStyles.shop}>
        {logo ? <Image src={logo} style={pdfStyles.logo} /> : null}
        <View style={{ flexShrink: 1 }}>
          <Text style={pdfStyles.shopName}>{shop.businessName || 'Your shop'}</Text>
          {shop.businessAddress ? <Text style={pdfStyles.shopLine}>{shop.businessAddress}</Text> : null}
          {contact ? <Text style={pdfStyles.shopLine}>{contact}</Text> : null}
          {shop.gstNumber ? <Text style={pdfStyles.shopLine}>GSTIN: {shop.gstNumber}</Text> : null}
        </View>
      </View>
      <View style={pdfStyles.doc}>
        <Text style={pdfStyles.docTitle}>{title}</Text>
        {number ? <Text style={pdfStyles.docNumber}>{number}</Text> : null}
        {meta.filter(([, value]) => value).map(([label, value]) => (
          <View key={label} style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaLabel}>{label}</Text>
            <Text style={pdfStyles.metaValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Who provides the service, on every document a shop sends out. */
export const POWERED_BY = {
  brand: 'ScaleEzy',
  line: 'Inventory, purchasing and stock management for retail',
  site: 'scaleezy.com'
};

/**
 * Bottom of every page: what the document is, when this copy was printed, page numbers, and the
 * service that produced it.
 *
 * The print time matters because the same order can be printed twice with different contents --
 * before and after a delivery, or before and after the letterhead changed -- and two papers that
 * disagree need a way to say which is newer.
 *
 * The ScaleEzy line sits below the shop's own details and in the smallest type on the page: the
 * document is the shop's, and a supplier reading it should see the shop first. It also tells that
 * supplier -- often a shop in the same trade -- what the paper was made with.
 */
export function LetterheadFooter({ shop = {}, label }) {
  const printed = printDate(new Date(), true);
  return (
    <View style={pdfStyles.footer} fixed>
      <View style={pdfStyles.footerRow}>
        <Text style={pdfStyles.footerText}>
          {label}{shop.businessName ? ` · ${shop.businessName}` : ''} · Printed {printed}
        </Text>
        <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
      <Text style={pdfStyles.poweredBy}>
        Generated with <Text style={pdfStyles.poweredByBrand}>{POWERED_BY.brand}</Text>
        {`  ·  ${POWERED_BY.line}  ·  ${POWERED_BY.site}`}
      </Text>
    </View>
  );
}
