import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, AlertTriangle, PackageCheck, Truck, ShoppingCart, CheckCircle2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReorderSuggestions, useCreateReorderDrafts } from '../hooks/useReorder';

/**
 * What is running out, grouped by who we would buy it from, and one action to turn that into
 * draft purchase orders.
 *
 * Both halves existed and never met: reports could list low stock and the alert centre could
 * prefill an order for a single item, so restocking meant working down a list one variant at
 * a time, remembering each item's supplier and opening a separate order per vendor.
 *
 * Everything is preselected, because the common case is "order all of this". Quantities stay
 * editable inline: the suggestion is a starting point, not an instruction.
 */
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ReorderSuggestions() {
  const { data, isLoading } = useReorderSuggestions();
  const createDrafts = useCreateReorderDrafts();
  const navigate = useNavigate();

  // variantId -> { selected, qty }. Seeded lazily from the server suggestion so a user edit
  // is never overwritten by a background refetch of the same numbers.
  const [edits, setEdits] = useState({});
  const [createdOrders, setCreatedOrders] = useState(null);

  const suppliers = data?.suppliers || [];
  const unassigned = data?.unassigned || [];

  const stateFor = (line) =>
    edits[line.variantId] || { selected: true, qty: line.suggestedQty };

  const setLine = (variantId, patch) =>
    setEdits(prev => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), ...patch }
    }));

  const selectedTotal = useMemo(() => {
    let total = 0;
    for (const group of suppliers) {
      for (const line of group.lines) {
        const st = edits[line.variantId] || { selected: true, qty: line.suggestedQty };
        if (st.selected) total += (Number(st.qty) || 0) * line.unitPrice;
      }
    }
    return total;
  }, [suppliers, edits]);

  const selectedCount = useMemo(() => {
    let n = 0;
    for (const group of suppliers) {
      for (const line of group.lines) {
        const st = edits[line.variantId] || { selected: true, qty: line.suggestedQty };
        if (st.selected && Number(st.qty) > 0) n++;
      }
    }
    return n;
  }, [suppliers, edits]);

  const handleCreate = () => {
    const groups = suppliers
      .map(group => ({
        supplierId: group.supplier.id,
        items: group.lines
          .map(line => {
            const st = edits[line.variantId] || { selected: true, qty: line.suggestedQty };
            return st.selected && Number(st.qty) > 0
              ? { variantId: line.variantId, orderedQty: Number(st.qty), unitPrice: line.unitPrice }
              : null;
          })
          .filter(Boolean)
      }))
      .filter(g => g.items.length > 0);

    if (!groups.length) return toast.error('Select at least one item to order');

    createDrafts.mutate(groups, {
      onSuccess: (res) => {
        setCreatedOrders(res.created || []);
        const n = res.created?.length || 0;
        toast.success(`${n} draft purchase order${n === 1 ? '' : 's'} created`);
        if (res.failed?.length) {
          toast.error(`${res.failed.length} could not be created — see the list below.`);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: 'var(--text-muted)' }}>
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--accent-gold)' }} />
        <span style={{ fontSize: '14px' }}>Working out what needs reordering...</span>
      </div>
    );
  }

  if (suppliers.length === 0 && unassigned.length === 0) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <PackageCheck size={48} style={{ opacity: 0.25, marginBottom: '16px' }} />
        <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Nothing needs reordering</h3>
        <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
          Every item with a reorder level set is above it.<br />
          Items without a reorder level are not tracked here — set one on a variant to include it.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '32px' }}>
      {createdOrders && createdOrders.length > 0 && (
        <div style={{
          border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <CheckCircle2 size={18} color="var(--accent-success)" />
            <strong style={{ fontSize: '15px', color: 'var(--accent-success)' }}>
              {createdOrders.length} draft purchase order{createdOrders.length === 1 ? '' : 's'} created
            </strong>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
            They are drafts — nothing has been sent. Open each one to review it and send it to the supplier.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {createdOrders.map(po => (
              <button
                key={po.id}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
              >
                {po.poNumber} <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', marginBottom: '20px'
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            {data.summary.lineCount} item{data.summary.lineCount === 1 ? '' : 's'} at or below reorder level
            {suppliers.length > 0 && ` across ${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{money(selectedTotal)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedCount} item{selectedCount === 1 ? '' : 's'} selected</div>
          </div>
          <button
            className="btn-primary"
            disabled={createDrafts.isPending || selectedCount === 0}
            onClick={handleCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {createDrafts.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            {createDrafts.isPending ? 'Creating...' : 'Create Draft Orders'}
          </button>
        </div>
      </div>

      {suppliers.map(group => (
        <motion.div
          key={group.supplier.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: 0, marginBottom: '16px' }}
        >
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Truck size={16} color="var(--accent-gold)" />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{group.supplier.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {group.supplier.supplierCode}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {group.lines.length} item{group.lines.length === 1 ? '' : 's'} · <strong style={{ color: 'var(--text-primary)' }}>{money(group.estimatedTotal)}</strong>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '20px' }}></th>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>In Stock</th>
                <th style={{ textAlign: 'right' }}>Reorder At</th>
                <th style={{ textAlign: 'right' }}>Order Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {group.lines.map(line => {
                const st = stateFor(line);
                const qty = Number(st.qty) || 0;
                return (
                  <tr key={line.variantId} style={{ borderTop: '1px solid var(--border-light)', opacity: st.selected ? 1 : 0.45 }}>
                    <td style={{ paddingLeft: '20px' }}>
                      <input
                        type="checkbox"
                        checked={st.selected}
                        onChange={(e) => setLine(line.variantId, { selected: e.target.checked, qty: st.qty })}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{line.productTitle}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {line.sku}
                        {line.supplierSku && ` · their code: ${line.supplierSku}`}
                        {line.leadTimeDays != null && ` · ${line.leadTimeDays}d lead`}
                      </div>
                      {line.raisedToMinimum && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-warning)', marginTop: '3px' }}>
                          Raised to this supplier's minimum order of {line.minOrderQty}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-warning)', fontWeight: 500 }}>
                        <AlertTriangle size={13} /> {line.currentStock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{line.reorderLevel}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={st.qty}
                        onChange={(e) => setLine(line.variantId, { selected: st.selected, qty: e.target.value })}
                        style={{ width: '80px', textAlign: 'right', padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{money(line.unitPrice)}</td>
                    <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 500 }}>{money(qty * line.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      ))}

      {unassigned.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={16} color="var(--accent-warning)" />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                No supplier recorded ({unassigned.length})
              </strong>
            </div>
            {/* Shown rather than hidden: these are precisely the items that would otherwise
                run out silently, since nothing can be ordered for them automatically. */}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>
              These are low but no supplier is linked, so no order can be prepared. Raise a purchase order for one
              and the supplier is recorded automatically for next time.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody>
              {unassigned.map(line => (
                <tr key={line.variantId} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ paddingLeft: '20px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{line.productTitle}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{line.sku}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--accent-warning)', fontWeight: 500 }}>{line.currentStock}</span>
                    <span style={{ color: 'var(--text-muted)' }}> / {line.reorderLevel}</span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '13px' }}
                      onClick={() => navigate('/inventory/purchase-orders/new', {
                        state: {
                          variantId: line.variantId, sku: line.sku, title: line.productTitle,
                          orderedQty: line.suggestedQty, costPrice: line.unitPrice
                        }
                      })}
                    >
                      Order manually
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
