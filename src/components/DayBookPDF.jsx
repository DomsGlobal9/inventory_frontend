import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

/**
 * The day book as a printable sheet -- the thing you file, email to an accountant, or hand
 * to an owner who does not log in.
 *
 * It mirrors the screen deliberately: same balance line, same order of sections, same
 * wording. A printed report that disagrees with the screen is worse than no printed report,
 * so every figure here comes from the same server payload the page renders, with nothing
 * recalculated on this side.
 *
 * Currency is written "Rs." rather than the rupee sign: the built-in Helvetica that
 * @react-pdf/renderer uses cannot encode U+20B9 and silently drops it, which would turn
 * every amount on the page into a bare number. The same applies to typographic dashes, so
 * plain hyphens are used throughout.
 */
const money = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (v) => Number(v || 0).toLocaleString('en-IN');
const signed = (v) => (Number(v) >= 0 ? '+' : '') + num(v);

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#333' },

  header: { borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 12, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111' },
  date: { fontSize: 11, color: '#444', marginTop: 4 },
  meta: { fontSize: 8, color: '#777', textAlign: 'right', lineHeight: 1.5 },
  running: {
    marginTop: 6, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#8a6d1f',
    backgroundColor: '#fbf3dc', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3,
    alignSelf: 'flex-start'
  },

  balanceBox: { borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 4, padding: 12, marginBottom: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  figure: { flexGrow: 1, flexBasis: 0 },
  figLabel: { fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  figUnits: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111' },
  figValue: { fontSize: 8, color: '#666', marginTop: 2 },
  figNote: { fontSize: 7, color: '#999', marginTop: 1, fontStyle: 'italic' },
  operator: { fontSize: 13, color: '#aaa', paddingHorizontal: 6, paddingBottom: 6 },
  verdict: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee', fontSize: 8 },
  ok: { color: '#1a7f4b' },
  bad: { color: '#b3261e', fontFamily: 'Helvetica-Bold' },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 2 },
  sectionSub: { fontSize: 7.5, color: '#888', marginBottom: 6 },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  stat: { width: '20%', marginBottom: 4 },
  statLabel: { fontSize: 7, color: '#888' },
  statValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111', marginTop: 2 },

  table: { borderWidth: 1, borderColor: '#eee', borderRadius: 3 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  trLast: { flexDirection: 'row' },
  th: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase',
    letterSpacing: 0.4, padding: 5, backgroundColor: '#fafafa'
  },
  td: { fontSize: 8, padding: 5, color: '#333' },

  empty: { fontSize: 8, color: '#999', fontStyle: 'italic', paddingVertical: 6 },
  footer: {
    position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: '#aaa',
    borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 6,
    flexDirection: 'row', justifyContent: 'space-between'
  }
});

/** Column widths are given per table so numbers can sit in narrower columns than names. */
function Table({ head, rows, widths, align = [] }) {
  if (!rows?.length) return <Text style={styles.empty}>Nothing to show.</Text>;
  return (
    <View style={styles.table}>
      <View style={styles.tr}>
        {head.map((h, i) => (
          <Text key={i} style={[styles.th, { width: widths[i], textAlign: align[i] || 'left' }]}>{h}</Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={ri === rows.length - 1 ? styles.trLast : styles.tr} wrap={false}>
          {r.map((c, ci) => (
            <Text key={ci} style={[styles.td, { width: widths[ci], textAlign: align[ci] || 'left' }]}>{c}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Figure({ label, units, value, note, bold }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figLabel}>{label}</Text>
      <Text style={[styles.figUnits, bold ? { fontSize: 16 } : {}]}>{num(units)}</Text>
      <Text style={styles.figValue}>{money(value)}</Text>
      {note ? <Text style={styles.figNote}>{note}</Text> : null}
    </View>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export default function DayBookPDF({ day, heading, businessName, locationName, generatedBy }) {
  const d = day || {};
  // A range reads the same way as one day, in its own words, with a row for each day.
  // Kept in step with backend/src/services/whatsapp/daybook-pdf.ts: change one, change the other.
  const isRange = Boolean(d.range);
  const span = isRange ? 'these days' : 'this day';
  const period = isRange ? `${d.range.from} to ${d.range.to}` : (d.date || '');
  const shortDate = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const printedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Document
      title={`Day Book ${period}`}
      author={businessName || 'Inventory'}
      subject={`${isRange ? 'Report' : 'End of day report'} for ${period}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Day Book</Text>
              <Text style={styles.date}>{heading || d.date}</Text>
            </View>
            <View>
              <Text style={styles.meta}>{businessName || ''}</Text>
              <Text style={styles.meta}>{locationName ? `Location: ${locationName}` : 'All locations'}</Text>
              <Text style={styles.meta}>Business day in {d.timezone || 'local time'}</Text>
            </View>
          </View>
          {d.inProgress ? (
            <Text style={styles.running}>
              {isRange ? 'STILL RUNNING - the last day is not finished, figures will change' : 'STILL RUNNING - this day is not finished, figures will change'}
            </Text>
          ) : null}
        </View>

        {/* The balance line, exactly as the screen states it. */}
        {d.opening && d.closing ? (
          <View style={styles.balanceBox}>
            <View style={styles.balanceRow}>
              <Figure
                label="Opening stock" units={d.opening.units} value={d.opening.value}
                note={d.opening.source === 'derived' ? 'worked back from today' : null}
              />
              <Text style={styles.operator}>+</Text>
              <Figure label="Came in" units={d.stockIn?.totalUnits} value={d.stockIn?.totalValue} />
              <Text style={styles.operator}>-</Text>
              <Figure label="Went out" units={d.stockOut?.totalUnits} value={d.stockOut?.totalValue} />
              <Text style={styles.operator}>=</Text>
              <Figure label="Closing stock" units={d.closing.units} value={d.closing.value} bold />
            </View>
            <Text style={[styles.verdict, d.balanced === false ? styles.bad : styles.ok]}>
              {d.balanced === true && `The books balance for ${span}.`}
              {d.balanced === false && 'These figures do not add up - treat them as unreliable and tell support.'}
              {d.balanced === null && `No independent record exists for ${span}, so the totals are shown without a balance check.`}
            </Text>
          </View>
        ) : null}

        {d.quiet ? (
          <Text style={styles.empty}>
            Nothing moved {span}. No stock came in or went out{d.inProgress ? ' so far' : ''}, and nothing was dispatched.
          </Text>
        ) : null}

        {d.sales?.dispatchCount > 0 ? (
          <Section title="Sales dispatched" subtitle="Counted when the goods actually left, not when the order was written.">
            <View style={styles.statRow}>
              <View style={styles.stat}><Text style={styles.statLabel}>Dispatches</Text><Text style={styles.statValue}>{num(d.sales.dispatchCount)}</Text></View>
              <View style={styles.stat}><Text style={styles.statLabel}>Units sent</Text><Text style={styles.statValue}>{num(d.sales.unitsDispatched)}</Text></View>
              <View style={styles.stat}><Text style={styles.statLabel}>Revenue</Text><Text style={styles.statValue}>{money(d.sales.revenue)}</Text></View>
              <View style={styles.stat}><Text style={styles.statLabel}>What it cost you</Text><Text style={styles.statValue}>{money(d.sales.costOfGoods)}</Text></View>
              <View style={styles.stat}><Text style={styles.statLabel}>Profit</Text><Text style={styles.statValue}>{money(d.sales.grossProfit)}</Text></View>
            </View>
            {/* A month of dispatches is pages of rows; a range shows its days instead (below). */}
            {isRange ? null : (
              <Table
                head={['Dispatch', 'Order', 'Customer', 'Units', 'Value']}
                widths={['20%', '20%', '30%', '12%', '18%']}
                align={['left', 'left', 'left', 'right', 'right']}
                rows={(d.sales.orders || []).map(o => [
                  o.dispatchNumber, o.orderNumber, o.customer || '-', num(o.units), money(o.value)
                ])}
              />
            )}
          </Section>
        ) : null}

        {isRange && d.days?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Day by day</Text>
            <Text style={styles.sectionSub}>Closing is the stock count at the end of that day. Sales are counted on the day the goods left.</Text>
            <Table
              head={['Day', 'In', 'Out', 'Closing', 'Dispatches', 'Revenue', 'Profit']}
              widths={['22%', '10%', '10%', '13%', '13%', '16%', '16%']}
              align={['left', 'right', 'right', 'right', 'right', 'right', 'right']}
              rows={d.days.map(r => [
                shortDate(r.date), r.unitsIn ? `+${num(r.unitsIn)}` : '-', r.unitsOut ? `-${num(r.unitsOut)}` : '-',
                r.closingUnits === null ? '-' : num(r.closingUnits),
                r.dispatchCount ? num(r.dispatchCount) : '-', r.dispatchCount ? money(r.revenue) : '-', r.dispatchCount ? money(r.grossProfit) : '-'
              ])}
            />
          </View>
        ) : null}

        <Section title="Stock that came in" subtitle={`${num(d.stockIn?.totalUnits)} units, ${money(d.stockIn?.totalValue)}`}>
          <Table
            head={['Reason', 'Units', 'Value']}
            widths={['60%', '18%', '22%']}
            align={['left', 'right', 'right']}
            rows={(d.stockIn?.lines || []).map(l => [l.label || l.reason, num(l.units), money(l.value)])}
          />
        </Section>

        <Section title="Stock that went out" subtitle={`${num(d.stockOut?.totalUnits)} units, ${money(d.stockOut?.totalValue)}`}>
          <Table
            head={['Reason', 'Units', 'Value']}
            widths={['60%', '18%', '22%']}
            align={['left', 'right', 'right']}
            rows={(d.stockOut?.lines || []).map(l => [l.label || l.reason, num(l.units), money(l.value)])}
          />
        </Section>

        {d.transfers?.unitsMoved > 0 ? (
          <Section title="Moved between your own locations"
            subtitle="Your total stock does not change - it just sits somewhere else.">
            <Text style={{ fontSize: 9 }}>{num(d.transfers.unitsMoved)} units moved</Text>
          </Section>
        ) : null}

        {d.byLocation?.length > 0 ? (
          <Section title="By location" subtitle="What changed where.">
            <Table
              head={['Location', 'In', 'Out', 'Net change', 'Transferred in', 'Transferred out']}
              widths={['30%', '12%', '12%', '16%', '15%', '15%']}
              align={['left', 'right', 'right', 'right', 'right', 'right']}
              rows={d.byLocation.map(l => [
                `${l.name} (${l.code})`,
                `+${num(l.unitsIn)}`,
                `-${num(l.unitsOut)}`,
                signed(l.netChange),
                l.transferIn ? `+${num(l.transferIn)}` : '-',
                l.transferOut ? `-${num(l.transferOut)}` : '-'
              ])}
            />
          </Section>
        ) : null}

        {d.topMovers?.length > 0 ? (
          <Section title="Busiest items">
            <Table
              head={['Item', 'SKU', 'In', 'Out']}
              widths={['48%', '26%', '13%', '13%']}
              align={['left', 'left', 'right', 'right']}
              rows={d.topMovers.map(m => [m.title || '-', m.sku || '-', `+${num(m.unitsIn)}`, `-${num(m.unitsOut)}`])}
            />
          </Section>
        ) : null}

        {d.adjustments?.length > 0 ? (
          <Section title="Manual corrections"
            subtitle="Changes somebody made by hand, rather than from an order or a delivery.">
            <Table
              head={['Item', 'Change', 'Reason', 'By']}
              widths={['38%', '14%', '26%', '22%']}
              align={['left', 'right', 'left', 'left']}
              rows={d.adjustments.slice(0, 40).map(a => [
                `${a.title || ''} ${a.sku || ''}`.trim() || '-',
                signed(a.units),
                a.reason,
                a.by || '-'
              ])}
            />
            {d.adjustments.length > 40 ? (
              <Text style={styles.sectionSub}>{`and ${num(d.adjustments.length - 40)} more - see them in the app`}</Text>
            ) : null}
          </Section>
        ) : null}

        {d.alsoToday ? (
          <Section title={isRange ? 'Also in these days' : 'Also on this day'}>
            <View style={styles.statRow}>
              <View style={[styles.stat, { width: '33%' }]}><Text style={styles.statLabel}>Purchase orders raised</Text><Text style={styles.statValue}>{num(d.alsoToday.purchaseOrdersRaised)}</Text></View>
              <View style={[styles.stat, { width: '33%' }]}><Text style={styles.statLabel}>Purchase orders received</Text><Text style={styles.statValue}>{num(d.alsoToday.purchaseOrdersReceived)}</Text></View>
              <View style={[styles.stat, { width: '33%' }]}><Text style={styles.statLabel}>New items added</Text><Text style={styles.statValue}>{num(d.alsoToday.newVariantsAdded)}</Text></View>
            </View>
          </Section>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>
            Generated {printedAt}{generatedBy ? ` by ${generatedBy}` : ''}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
