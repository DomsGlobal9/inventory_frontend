import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, TrendingUp, TrendingDown, ArrowLeftRight, AlertTriangle, CheckCircle2,
  Calendar, MapPin, Coffee, Download, Info
} from 'lucide-react';
import { useDayBook } from '../hooks/useDayBook';
import { useLocationContext } from '../contexts/LocationContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import DayBookPDF from '../components/DayBookPDF';
import DayBookSendButton from '../components/whatsapp/DayBookSendButton';

/**
 * One business day, closed off the way a shop owner closes a till.
 *
 * The organising idea is the balance line: opening + in - out = closing. Everything else on
 * the page explains those four numbers. If the identity fails the page says so at the top
 * rather than presenting totals that look authoritative and are not.
 *
 * The day is the SHOP's day, resolved on the server from its timezone -- the browser's clock
 * is never consulted, so checking yesterday's takings while travelling still shows the right
 * business day.
 */
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (v) => Number(v || 0).toLocaleString('en-IN');

/** Yesterday, as a YYYY-MM-DD key, without dragging in a date library. */
const shiftKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** The longest range one book covers; the server holds the same limit. */
const MAX_RANGE_DAYS = 31;
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
const shortDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const weekDay = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function DayBook() {
  const [date, setDate] = useState('');       // '' means today, resolved server-side
  // One day, or a run of days. The two ends are typed freely; only a range that makes sense is
  // asked for, so a half-typed or backwards range never blanks the page.
  const [mode, setMode] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const rangeProblem = mode !== 'range' || !from || !to ? null
    : from > to ? 'The first day is after the last day.'
      : daysBetween(from, to) > MAX_RANGE_DAYS ? `Choose ${MAX_RANGE_DAYS} days or fewer.`
        : null;
  // While the ends on the screen do not make a range (backwards, too long, half typed), the last
  // range that did stays on the page, rather than the page jumping to some single day.
  const typedRange = mode === 'range' && from && to && !rangeProblem ? { from, to } : null;
  const lastGoodRange = useRef(null);
  // Opening a day from the Day by day table jumps back up to its header, so the day chosen is
  // what the person sees, not the bottom of a page they were scrolling.
  const topRef = useRef(null);
  const jumpToTop = useRef(false);
  if (typedRange) lastGoodRange.current = typedRange;
  const range = mode === 'range' ? (typedRange || lastGoodRange.current) : null;
  const [locationId, setLocationId] = useState('');
  const [printing, setPrinting] = useState(false);
  // isFetching, not just isLoading: placeholderData keeps the previous day on screen while a
  // new one loads, so between clicking a date and the answer arriving the page shows one day's
  // figures. Exporting during that window produced a PDF of the day you had just navigated
  // away from, named after it too, with nothing on screen to suggest anything was wrong.
  const { data, isLoading, isFetching, isError, error } = useDayBook(date || undefined, locationId || undefined, range);
  // Reuses the locations the app already loaded for its header selector rather than
  // fetching them again for a dropdown.
  const { locations = [] } = useLocationContext();
  const { user } = useAuth();
  // After the day has loaded: the page changes height as it arrives, so jumping earlier lands
  // part-way down.
  useEffect(() => {
    if (jumpToTop.current && !isFetching) {
      jumpToTop.current = false;
      topRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [isFetching, date]);

  if (isLoading && !data) {
    return (
      <div style={{ padding: '120px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
        <Loader2 size={34} className="animate-spin" style={{ color: 'var(--accent-gold)' }} />
        <span style={{ fontSize: '15px' }}>Closing off the day...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={40} style={{ opacity: 0.3, marginBottom: '14px' }} />
        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Could not load the day</h3>
        <p style={{ fontSize: '14px', margin: 0 }}>{error?.message || 'Please try again.'}</p>
      </div>
    );
  }

  const d = data;
  const shownDate = d?.date || '';
  // A range that is one day comes back as that day, so the answer decides, not the mode.
  const isRange = Boolean(d?.range);
  const span = isRange ? 'these days' : 'this day';
  // The same words the WhatsApp message and the PDF carry.
  const heading = isRange
    ? `${shortDay(d.range.from)} to ${shortDay(d.range.to)}`
    : new Date(`${shownDate}T12:00:00Z`).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

  const showRange = (first, last) => { setFrom(first); setTo(last); setMode('range'); };
  // The shop's own "today" when the page is showing it; otherwise this device's, for the
  // shortcuts only. The server still decides what each day holds.
  const todayKey = d?.inProgress && !isRange ? shownDate : new Date().toLocaleDateString('en-CA');

  // Plain-text summary for WhatsApp. Deliberately short -- it is a glance on a phone, not
  // the full page, and a long message gets truncated by the app anyway.
  const summaryText = d ? [
    `*${heading}*`,
    '',
    `Opening stock: ${num(d.opening?.units)} units`,
    `In: +${num(d.stockIn.totalUnits)}   Out: -${num(d.stockOut.totalUnits)}`,
    `Closing stock: ${num(d.closing?.units)} units (${money(d.closing?.value)})`,
    '',
    d.sales.dispatchCount
      ? `Sales: ${d.sales.dispatchCount} dispatch(es), ${num(d.sales.unitsDispatched)} units, ${money(d.sales.revenue)}`
      : 'No sales dispatched.',
    d.sales.dispatchCount ? `Profit: ${money(d.sales.grossProfit)}` : '',
    '',
    user?.name || ''
  ].filter(Boolean).join('\n') : '';

  // No number: WhatsApp then asks who to send it to. The day book goes to a partner, an
  // accountant or a family group, never to a fixed chat -- and the old stand-in number built
  // wa.me/910000000000 for anyone without a phone saved, a chat that does not exist.
  const waUrl = summaryText ? `https://wa.me/?text=${encodeURIComponent(summaryText)}` : null;

  // The document is built only when it is asked for. A PDFDownloadLink renders the whole PDF
  // on every page render, so it would rebuild each time the date or location changes, for a
  // file most visits never download.
  const downloadPdf = async () => {
    if (!d || printing || isFetching) return;
    setPrinting(true);
    let url;
    try {
      const blob = await pdf(
        <DayBookPDF
          day={d}
          heading={heading}
          businessName={d.businessName || user?.clientName || ''}
          locationName={locations.find(l => l.id === locationId)?.name || ''}
          generatedBy={user?.name || ''}
        />
      ).toBlob();
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `day-book-${isRange ? `${d.range.from}-to-${d.range.to}` : shownDate}${locationId ? '-' + (locations.find(l => l.id === locationId)?.code || 'location') : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Day book PDF failed', err);
      // A toast, not alert(): the native box is a grey system dialog that does not belong to
      // this app, and it blocks the whole tab until it is dismissed -- for a message that only
      // needs to be read.
      toast.error('Could not build the PDF. Please try again.');
    } finally {
      // Revoking immediately can cancel the download in some browsers, so it is deferred.
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
      setPrinting(false);
    }
  };

  return (
    <div className="page-scroll">
      {/* ── Header: date, location, share ───────────────────────────────── */}
      <div ref={topRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '24px', scrollMarginTop: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Day Book
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>
            {heading}
            {d?.inProgress && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', color: 'var(--accent-gold)', background: 'rgba(226,193,113,0.14)' }}>
                STILL RUNNING
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div role="group" aria-label="One day or several" style={{ display: 'inline-flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
            {[['day', 'One day'], ['range', 'From - to']].map(([key, text]) => (
              <button key={key} type="button" aria-pressed={mode === key}
                onClick={() => (key === 'range' ? showRange(from || shiftKey(todayKey, -6), to || todayKey) : setMode('day'))}
                style={{
                  padding: '8px 12px', fontSize: '13px', border: 'none', cursor: 'pointer',
                  background: mode === key ? 'var(--accent-gold)' : 'transparent',
                  color: mode === key ? '#1b1f1a' : 'var(--text-secondary)', fontWeight: mode === key ? 600 : 400
                }}>{text}</button>
            ))}
          </div>
          {mode === 'day' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--text-muted)" />
                <input
                  type="date"
                  aria-label="Day"
                  className="input-field"
                  value={shownDate}
                  max={d?.inProgress ? shownDate : undefined}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                />
              </div>
              <button className="btn-secondary" style={{ fontSize: '13px' }}
                onClick={() => setDate(shiftKey(shownDate, -1))}>
                Previous day
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--text-muted)" />
                <input type="date" aria-label="From" className="input-field" value={from} max={to || todayKey}
                  onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>to</span>
                <input type="date" aria-label="To" className="input-field" value={to} min={from || undefined} max={todayKey}
                  onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px' }} />
              </div>
              <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => showRange(shiftKey(todayKey, -6), todayKey)}>Last 7 days</button>
              <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => showRange(`${todayKey.slice(0, 8)}01`, todayKey)}>This month</button>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} color="var(--text-muted)" />
            <select className="input-field" value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              style={{ padding: '8px 10px', fontSize: '13px' }}>
              <option value="">All locations</option>
              {/* Name and code, as every other location box in the app shows it (TopNav,
                  Transfers, bulk update). Name alone made two branches a shop had called the
                  same thing impossible to tell apart here -- and this is the screen where
                  picking the wrong one quietly gives you another shop's day. */}
              {locations.map(l => <option key={l.id} value={l.id}>{l.code ? `${l.name} (${l.code})` : l.name}</option>)}
            </select>
          </div>
          <button className="btn-secondary" onClick={downloadPdf} disabled={printing || !d || isFetching}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px',
              opacity: (printing || isFetching) ? 0.55 : 1,
              cursor: (printing || isFetching) ? 'not-allowed' : 'pointer'
            }}
            title={isFetching ? 'Waiting for it to load' : isRange ? 'Download these days as one PDF' : 'Download this day as a PDF'}>
            {(printing || isFetching) ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {printing ? 'Preparing...' : 'PDF'}
          </button>
          {d && (
            <DayBookSendButton
              what={{ ...(isRange ? { from: d.range.from, to: d.range.to } : { date: shownDate }), ...(locationId ? { locationId } : {}) }}
              whatLabel={heading}
              disabled={isFetching || Boolean(rangeProblem)}
              fallbackHref={waUrl}
            />
          )}
        </div>
      </div>

      {rangeProblem && (
        <div role="alert" style={{ margin: '-10px 0 18px', fontSize: '13px', color: 'var(--accent-warning)' }}>
          {rangeProblem} The page still shows the last days that were chosen.
        </div>
      )}

      {/* ── Nothing happened ────────────────────────────────────────────── */}
      {d?.quiet && (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '12px', marginBottom: '24px' }}>
          <Coffee size={40} style={{ opacity: 0.25, marginBottom: '14px' }} />
          <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Nothing moved {span}</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>
            No stock came in or went out{d.inProgress ? ' so far today' : ''}, and nothing was dispatched.
          </p>
        </div>
      )}

      {/* ── The balance line ────────────────────────────────────────────── */}
      {d?.opening && d?.closing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <Figure label="Opening stock" units={d.opening.units} value={d.opening.value}
              note={d.opening.source === 'derived' ? 'worked back from today' : null} />
            <Operator symbol="+" />
            <Figure label="Came in" units={d.stockIn.totalUnits} value={d.stockIn.totalValue} tone="in" />
            <Operator symbol="−" />
            <Figure label="Went out" units={d.stockOut.totalUnits} value={d.stockOut.totalValue} tone="out" />
            <Operator symbol="=" />
            <Figure label="Closing stock" units={d.closing.units} value={d.closing.value} strong />
          </div>

          {/* Three states, not two. `balanced` is null when there is no independent record to
              check against -- a day before the shop's first movement, say -- and treating that
              as false told the owner their books were broken when nothing was wrong. Silence
              is the honest answer there, so the page makes no claim either way. */}
          <div style={{
            marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
            color: d.balanced === false ? 'var(--accent-danger)'
              : (d.balanced === true && d.valueMatches !== false) ? 'var(--accent-success)'
              : 'var(--text-muted)'
          }}>
            {d.balanced === true && d.valueMatches !== false && (
              <><CheckCircle2 size={15} /> The books balance for {span}.</>
            )}
            {/* The count agreeing while the value does not is the NORMAL case for a shop that
                values stock at a weighted average, and it is not a fault. When goods arrive at
                a new price, the pieces already on the shelf are re-valued to the new average
                too, and that re-valuation is not a movement -- so it cannot appear in what came
                in or went out, and the closing figure calculated from movements drifts from
                what the stock is actually worth.

                Saying "the books balance" without qualification was the problem: only the
                count had ever been checked, and a closing stock value is exactly the number
                somebody writes down as what their stock is worth. */}
            {d.balanced === true && d.valueMatches === false && (
              <><Info size={15} /> Every piece is accounted for. The closing value is{' '}
                {money(Math.abs(d.valueGap))} {d.valueGap > 0 ? 'lower than' : 'higher than'} what
                your stock is worth today ({money(d.measuredClosingValue)}), because stock you
                already had was re-valued when new stock arrived at a different price. Nothing
                is missing.</>
            )}
            {d.balanced === false && <><AlertTriangle size={15} /> These figures do not add up — treat them as unreliable and tell support.</>}
            {d.balanced === null && <><Info size={15} /> There is no separate record for {span} to check these totals against.</>}
          </div>
        </motion.div>
      )}

      {/* ── Sales ───────────────────────────────────────────────────────── */}
      {d?.sales?.dispatchCount > 0 && (
        <Panel title="Sales dispatched" subtitle="Counted when the goods actually left, not when the order was written.">
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', padding: '18px 20px' }}>
            <Stat label="Dispatches" value={num(d.sales.dispatchCount)} />
            <Stat label="Units sent" value={num(d.sales.unitsDispatched)} />
            <Stat label="Revenue" value={money(d.sales.revenue)} />
            <Stat label="What it cost you" value={money(d.sales.costOfGoods)} />
            <Stat label="Profit" value={money(d.sales.grossProfit)}
              tone={d.sales.grossProfit >= 0 ? 'good' : 'bad'} />
          </div>
          {/* Said plainly, because the alternative is a merchant believing they made 5,000
              profit on a 5,000 sale. Stock that was never costed contributes nothing to "what
              it cost you", so its entire selling price sits in the profit above. */}
          {d.sales.unitsSoldWithoutCost > 0 && (
            <div style={{
              margin: '0 20px 18px', padding: '10px 14px', borderRadius: '8px',
              background: 'var(--bg-input)', border: '1px solid var(--border-light)',
              fontSize: '13px', color: 'var(--text-secondary)'
            }}>
              This profit is higher than the real one. {num(d.sales.unitsSoldWithoutCost)} of the
              units sold had no cost recorded, so their full selling price is counted as profit.
              Add a cost price to those items to see the true figure.
            </div>
          )}
          {/* A month of dispatches is a very long list; a range shows its days instead (below). */}
          {!isRange && d.sales.orders.length > 0 && (
            <SimpleTable
              head={['Dispatch', 'Order', 'Customer', 'Units', 'Value']}
              rows={d.sales.orders.map(o => [
                o.dispatchNumber, o.orderNumber, o.customer || '—', num(o.units), money(o.value)
              ])}
            />
          )}
        </Panel>
      )}

      {/* ── Money at the counter: taken, paid back, and what the cash drawer should hold ── */}
      {d?.money && (Object.keys(d.money.taken).length > 0 || Object.keys(d.money.paidBack).length > 0) && (
        <Panel title="Money at the counter" subtitle="Taken on sales and paid back on returns, by how. Points and store credit are not cash in the drawer.">
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', padding: '18px 20px' }}>
            <Stat label="Cash in the drawer from these" value={money(d.money.cashInDrawer)} tone={d.money.cashInDrawer >= 0 ? 'good' : 'bad'} />
          </div>
          <SimpleTable
            head={['How', 'Taken', 'Paid back']}
            rows={['CASH', 'UPI', 'CARD', 'POINTS', 'CREDIT'].filter(m => d.money.taken[m] || d.money.paidBack[m]).map(m => [
              { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', POINTS: 'Loyalty points', CREDIT: 'Store credit' }[m],
              d.money.taken[m] ? money(d.money.taken[m].amount) : '—',
              d.money.paidBack[m] ? money(d.money.paidBack[m].amount) : '—'
            ])}
          />
        </Panel>
      )}

      {/* ── A range: one row per day ─────────────────────────────────────── */}
      {isRange && d.days?.length > 0 && (
        <Panel title="Day by day" subtitle="Closing is the stock count at the end of that day. Sales are counted on the day the goods left. Press a day to open it.">
          <SimpleTable
            head={['Day', 'In', 'Out', 'Closing', 'Dispatches', 'Revenue', 'Profit']}
            rows={d.days.map(r => [
              <button key={r.date} type="button" onClick={() => { jumpToTop.current = true; setDate(r.date); setMode('day'); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', font: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--border-light)', whiteSpace: 'nowrap' }}>
                {weekDay(r.date)}
              </button>,
              r.unitsIn ? `+${num(r.unitsIn)}` : '—', r.unitsOut ? `-${num(r.unitsOut)}` : '—',
              r.closingUnits === null ? '—' : num(r.closingUnits),
              r.dispatchCount ? num(r.dispatchCount) : '—', r.dispatchCount ? money(r.revenue) : '—', r.dispatchCount ? money(r.grossProfit) : '—'
            ])}
          />
        </Panel>
      )}

      {/* ── In and out, by reason ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '16px', marginBottom: '16px' }}>
        <ReasonPanel title="Stock that came in" icon={TrendingUp} tone="in"
          lines={d?.stockIn?.lines || []} totalUnits={d?.stockIn?.totalUnits} totalValue={d?.stockIn?.totalValue} />
        <ReasonPanel title="Stock that went out" icon={TrendingDown} tone="out"
          lines={d?.stockOut?.lines || []} totalUnits={d?.stockOut?.totalUnits} totalValue={d?.stockOut?.totalValue} />
      </div>

      {/* ── Transfers ───────────────────────────────────────────────────── */}
      {d?.transfers?.unitsMoved > 0 && (
        <Panel title="Moved between your own locations"
          subtitle="Your total stock does not change — it just sits somewhere else.">
          <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-primary)' }}>
            <ArrowLeftRight size={16} color="var(--accent-gold)" />
            {num(d.transfers.unitsMoved)} units moved
          </div>
        </Panel>
      )}

      {/* ── Per location ────────────────────────────────────────────────── */}
      {d?.byLocation?.length > 0 && (
        <Panel title="By location" subtitle="What changed where.">
          <SimpleTable
            head={['Location', 'In', 'Out', 'Net change', 'Transferred in', 'Transferred out']}
            rows={d.byLocation.map(l => [
              `${l.name} (${l.code})`,
              `+${num(l.unitsIn)}`,
              `-${num(l.unitsOut)}`,
              (l.netChange >= 0 ? '+' : '') + num(l.netChange),
              l.transferIn ? `+${num(l.transferIn)}` : '—',
              l.transferOut ? `-${num(l.transferOut)}` : '—'
            ])}
          />
        </Panel>
      )}

      {/* ── Top movers ──────────────────────────────────────────────────── */}
      {d?.topMovers?.length > 0 && (
        <Panel title="Busiest items">
          <SimpleTable
            head={['Item', 'SKU', 'In', 'Out']}
            rows={d.topMovers.map(m => [m.title || '—', m.sku || '—', `+${num(m.unitsIn)}`, `-${num(m.unitsOut)}`])}
          />
        </Panel>
      )}

      {/* ── Corrections ─────────────────────────────────────────────────── */}
      {d?.adjustments?.length > 0 && (
        <Panel title="Manual corrections"
          subtitle="Changes somebody made by hand, rather than from an order or a delivery.">
          <SimpleTable
            head={['Item', 'Change', 'Reason', 'By']}
            rows={d.adjustments.map(a => [
              `${a.title || ''} ${a.sku || ''}`.trim() || '—',
              (a.units >= 0 ? '+' : '') + num(a.units),
              a.reason,
              a.by || '—'
            ])}
          />
        </Panel>
      )}

      {/* ── Also today ──────────────────────────────────────────────────── */}
      {d?.alsoToday && (
        <Panel title={isRange ? 'Also in these days' : 'Also on this day'}>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', padding: '18px 20px' }}>
            <Stat label="Purchase orders raised" value={num(d.alsoToday.purchaseOrdersRaised)} />
            <Stat label="Purchase orders received" value={num(d.alsoToday.purchaseOrdersReceived)} />
            <Stat label="New items added" value={num(d.alsoToday.newVariantsAdded)} />
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ── small building blocks ─────────────────────────────────────────────── */

function Figure({ label, units, value, note, strong, tone }) {
  const color = tone === 'in' ? 'var(--accent-success)'
    : tone === 'out' ? 'var(--accent-warning)'
    : 'var(--text-primary)';
  return (
    <div style={{ minWidth: '130px' }}>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: strong ? '26px' : '22px', fontWeight: strong ? 700 : 600, color, lineHeight: 1.1 }}>
        {tone === 'in' ? '+' : tone === 'out' ? '−' : ''}{num(units)}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{money(value)}</div>
      {note && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{note}</div>}
    </div>
  );
}

const Operator = ({ symbol }) => (
  <div style={{ fontSize: '22px', color: 'var(--text-muted)', fontWeight: 300 }}>{symbol}</div>
);

function Stat({ label, value, tone }) {
  const color = tone === 'good' ? 'var(--accent-success)' : tone === 'bad' ? 'var(--accent-danger)' : 'var(--text-primary)';
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '19px', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="glass-panel" style={{ padding: 0, marginBottom: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ReasonPanel({ title, icon: Icon, tone, lines, totalUnits, totalValue }) {
  const color = tone === 'in' ? 'var(--accent-success)' : 'var(--accent-warning)';
  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon size={16} color={color} /> {title}
        </h3>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color }}>{num(totalUnits)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{money(totalValue)}</div>
        </div>
      </div>
      {lines.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Nothing {tone === 'in' ? 'came in' : 'went out'}.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            {lines.map(l => (
              <tr key={l.reason} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '11px 20px', fontSize: '14px', color: 'var(--text-primary)' }}>{l.label}</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 500, color }}>{num(l.units)}</td>
                <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{money(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * The panel around these tables clips its overflow to keep its rounded corners, so a table
 * wider than the panel loses its right-hand columns outright rather than scrolling to them --
 * on a phone the location breakdown simply ended after "Net change". The scroll container
 * belongs here, inside the clip.
 */
function SimpleTable({ head, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} style={{
              padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--text-muted)', fontWeight: 600, textAlign: i === 0 ? 'left' : 'right',
              whiteSpace: 'nowrap'
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} style={{ borderTop: '1px solid var(--border-light)' }}>
            {r.map((cell, ci) => (
              <td key={ci} style={{
                padding: '11px 20px', fontSize: '14px',
                color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: ci === 0 ? 'left' : 'right'
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
