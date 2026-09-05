import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Loader2, AlertTriangle, Package, Layers, Wallet, TruckIcon, Clock, Archive,
  BookOpen, ArrowRight, TrendingUp, Building2, MapPin, Globe
} from 'lucide-react';
import {
  useInventorySummary, useMovementAging, useCategoryValue, useOpenPoValue, useLowStockValue
} from '../hooks/useReports';
import { useDeadStock } from '../hooks/useDeadStock';
import { useSupplierSpend } from '../hooks/useSupplierSpend';
import { useStockMovement } from '../hooks/useStockMovement';
import { useLocationContext } from '../contexts/LocationContext';

/**
 * Where the money is, rather than what happened today -- the day book answers that.
 *
 * Every figure here already existed on the server and was never shown to anybody: the
 * endpoints were built, wired to permissions, and then had no page. This is that page.
 *
 * Each panel loads on its own, so one slow or failing query does not blank the rest, and
 * each says plainly what it means: "money committed", "not sold in N days". A number without
 * its meaning is where inventory reports usually go wrong.
 */
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const num = (v) => Number(v || 0).toLocaleString('en-IN');

const AGE_ORDER = ['0-30', '31-60', '61-90', '90+'];
const AGE_LABEL = {
  '0-30': 'Moved in the last month',
  '31-60': 'Last moved 1-2 months ago',
  '61-90': 'Last moved 2-3 months ago',
  '90+': 'Not moved in over 3 months'
};
const AGE_TONE = {
  '0-30': 'var(--accent-success)',
  '31-60': 'var(--accent-gold)',
  '61-90': 'var(--accent-warning)',
  '90+': 'var(--accent-danger)'
};

const MOVEMENT_LABEL = {
  IN: 'Stock received',
  OUT: 'Stock sent out',
  ADJUSTMENT: 'Manual corrections',
  TRANSFER: 'Moved between locations'
};

export default function Reports() {
  const { currentLocation, isLoading: locationsLoading } = useLocationContext();
  const [deadDays, setDeadDays] = useState(90);
  const [moveDays, setMoveDays] = useState(30);

  const summary = useInventorySummary();
  const openPo = useOpenPoValue();
  const lowStock = useLowStockValue();
  const categories = useCategoryValue();
  const aging = useMovementAging();
  const dead = useDeadStock(deadDays);
  const spend = useSupplierSpend();
  const movement = useStockMovement(moveDays);

  const agingTotal = (aging.data || []).reduce((a, r) => a + r.totalValue, 0);
  const categoryTotal = (categories.data || []).reduce((a, r) => a + r.totalValue, 0);

  return (
    <div className="page-scroll">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Reports
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>
          Where your money is sitting, and what it is doing.
        </p>
        {/* Stock figures follow the location chosen in the header. Saying so matters: the
            same page also carries company-wide figures, and an unlabelled mix of the two is
            how a report ends up quietly contradicting itself. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <MapPin size={14} />
          Stock figures below are for{' '}
          <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {/* Until the location list has loaded this genuinely is not known: the request
                interceptor already scopes the calls from stored state, so claiming "all
                locations" in the meantime would label scoped figures as company-wide. */}
            {locationsLoading ? '…' : currentLocation ? currentLocation.name : 'all locations'}
          </strong>
        </div>
      </div>

      {/* Day book is the other half of reporting, so it is linked rather than duplicated. */}
      <Link to="/reports/daybook" style={{ textDecoration: 'none' }}>
        <motion.div whileHover={{ x: 3 }} className="glass-panel"
          style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
          <BookOpen size={20} color="var(--accent-gold)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Day Book</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Close off a single day: what came in, what went out, what you sold.
            </div>
          </div>
          <ArrowRight size={17} color="var(--text-muted)" />
        </motion.div>
      </Link>

      {/* ── Headline numbers ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <HeadlineCard icon={Wallet} label="Stock you are holding"
          value={money(summary.data?.totalValue)}
          sub={`${num(summary.data?.totalUnits)} units`}
          state={summary} />
        <HeadlineCard icon={Package} label="Active products"
          value={num(summary.data?.totalProducts)}
          sub={`${num(summary.data?.totalVariants)} variants`}
          state={summary} />
        <HeadlineCard icon={TruckIcon} label="Money committed to orders"
          value={money(openPo.data?.openPoValue)}
          sub="Sent, not yet received · whole business"
          state={openPo} />
        <HeadlineCard icon={AlertTriangle} label="Running low"
          value={num(lowStock.data?.lowStockCount)}
          sub={`${money(lowStock.data?.reorderExposure)} to restock`}
          tone={lowStock.data?.lowStockCount > 0 ? 'warn' : undefined}
          state={lowStock} />
      </div>

      {/* ── How long since it moved ─────────────────────────────────────── */}
      <Panel title="How long since each item last moved"
        subtitle="Stock that has not moved in months is money you cannot spend."
        state={aging}
        empty={!aging.data?.length && 'Nothing in stock has a movement recorded yet.'}>
        <div style={{ padding: '18px 20px' }}>
          {AGE_ORDER.filter(b => (aging.data || []).some(r => r.ageBracket === b)).map(bracket => {
            const row = aging.data.find(r => r.ageBracket === bracket);
            const pct = agingTotal > 0 ? (row.totalValue / agingTotal) * 100 : 0;
            return (
              <div key={bracket} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{AGE_LABEL[bracket]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {money(row.totalValue)} · {num(row.variantCount)} item{row.variantCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ height: '7px', borderRadius: '999px', background: 'var(--bg-subtle, rgba(255,255,255,0.06))', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                    style={{ height: '100%', background: AGE_TONE[bracket], borderRadius: '999px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* ── By category ───────────────────────────────────────────────── */}
        <Panel title="Value by category" icon={Layers}
          subtitle="Which kinds of stock hold the most money."
          scope={locationsLoading ? null : currentLocation ? currentLocation.name : null}
          state={categories}
          empty={!categories.data?.length && 'No categories to show yet.'}>
          <Table
            head={['Category', 'Units', 'Value', 'Share']}
            rows={(categories.data || []).map(c => [
              c.category || 'Uncategorised',
              num(c.totalUnits),
              money(c.totalValue),
              categoryTotal > 0 ? `${((c.totalValue / categoryTotal) * 100).toFixed(0)}%` : '—'
            ])}
          />
        </Panel>

        {/* ── Supplier spend ────────────────────────────────────────────── */}
        <Panel title="What you have spent per supplier" icon={Building2}
          subtitle="Counts only orders you have actually received."
          scope="whole business"
          state={spend}
          empty={!spend.data?.length && 'No received purchase orders yet.'}>
          <Table
            head={['Supplier', 'Code', 'Spent']}
            rows={(spend.data || []).map(s => [s.supplierName, s.supplierCode, money(s.totalSpend)])}
          />
        </Panel>
      </div>

      {/* ── Stock movement ──────────────────────────────────────────────── */}
      <Panel title="Stock movement" icon={TrendingUp}
        subtitle="Every recorded change, grouped by why it happened."
        state={movement}
        empty={!movement.data?.length && `Nothing moved in the last ${moveDays} days.`}
        action={
          <RangePicker value={moveDays} onChange={setMoveDays} options={[7, 30, 90, 365]} suffix="days" />
        }>
        <Table
          head={['Reason', 'Times', 'Net units']}
          rows={(movement.data || []).map(m => [
            MOVEMENT_LABEL[m.type] || m.type,
            num(m.transactionCount),
            (m.totalQuantity >= 0 ? '+' : '') + num(m.totalQuantity)
          ])}
        />
      </Panel>

      {/* ── Dead stock ──────────────────────────────────────────────────── */}
      <Panel title="Stock that is not selling" icon={Archive}
        subtitle="Items still on the shelf that have not moved in the chosen period. Worth discounting or returning."
        state={dead}
        empty={!dead.data?.length && `Nothing has sat still for ${deadDays} days. That is a good sign.`}
        action={
          <RangePicker value={deadDays} onChange={setDeadDays} options={[30, 60, 90, 180, 365]} suffix="days" />
        }>
        <Table
          head={['Item', 'SKU', 'Category', 'Units', 'Value', 'Still since']}
          rows={(dead.data || []).map(r => [
            r.productTitle || '—',
            r.sku,
            r.category || '—',
            num(r.quantity),
            money(r.inventoryValue),
            r.daysSinceLastMovement === null ? '—' : `${num(r.daysSinceLastMovement)} days`
          ])}
        />
      </Panel>
    </div>
  );
}

/* ── building blocks ──────────────────────────────────────────────────── */

function HeadlineCard({ icon: Icon, label, value, sub, tone, state }) {
  const color = tone === 'warn' ? 'var(--accent-warning)' : 'var(--text-primary)';
  return (
    <div className="glass-panel" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <Icon size={15} color="var(--text-muted)" />
        <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      {state?.isLoading ? (
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      ) : state?.isError ? (
        <div style={{ fontSize: '13px', color: 'var(--accent-danger)' }}>Could not load</div>
      ) : (
        <>
          <div style={{ fontSize: '24px', fontWeight: 600, color, lineHeight: 1.15 }}>{value}</div>
          {sub && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

/**
 * A panel owns its own loading and error state so one failing query cannot take the page
 * down with it -- the rest of the report stays readable and says which part is missing.
 */
function Panel({ title, subtitle, icon: Icon, state, empty, action, scope, children }) {
  return (
    <div className="glass-panel" style={{ padding: 0, marginBottom: '16px', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icon && <Icon size={16} color="var(--accent-gold)" />} {title}
          </h3>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
          {scope && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '7px',
              fontSize: '11.5px', color: 'var(--text-muted)', border: '1px solid var(--border-light)',
              borderRadius: '999px', padding: '2px 9px'
            }}>
              <Globe size={11} /> {scope}
            </span>
          )}
        </div>
        {action}
      </div>

      {state?.isLoading ? (
        <div style={{ padding: '36px', textAlign: 'center' }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : state?.isError ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--accent-danger)' }}>
          <AlertTriangle size={18} style={{ marginBottom: '6px' }} />
          <div>{state.error?.message || 'Could not load this report.'}</div>
        </div>
      ) : empty ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: '13.5px', color: 'var(--text-muted)' }}>
          {empty}
        </div>
      ) : children}
    </div>
  );
}

function RangePicker({ value, onChange, options, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Clock size={14} color="var(--text-muted)" />
      <select className="input-field" value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: '7px 10px', fontSize: '13px' }}>
        {options.map(o => <option key={o} value={o}>Last {o} {suffix}</option>)}
      </select>
    </div>
  );
}

function Table({ head, rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} style={{
                padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text-muted)', fontWeight: 600, textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap'
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
                  textAlign: ci === 0 ? 'left' : 'right', whiteSpace: 'nowrap'
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
