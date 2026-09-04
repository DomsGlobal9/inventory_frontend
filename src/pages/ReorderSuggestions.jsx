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
 */
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ReorderSuggestions() {
  const { data, isLoading } = useReorderSuggestions();
  const createDrafts = useCreateReorderDrafts();
  const navigate = useNavigate();

  // variantId -> { selected, qty }. Seeded lazily from the server suggestion.
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
      <div style={{ padding: '120px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--text-primary)' }} />
        <span style={{ fontSize: '15px', fontWeight: '500' }}>Analyzing inventory levels...</span>
      </div>
    );
  }

  if (suppliers.length === 0 && unassigned.length === 0) {
    return (
      <div style={{ padding: '120px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <PackageCheck size={56} style={{ opacity: 0.2, marginBottom: '24px' }} />
        <h3 style={{ fontSize: '22px', fontWeight: '600', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 12px' }}>Inventory is Healthy</h3>
        <p style={{ fontSize: '15px', margin: 0, lineHeight: 1.6, maxWidth: '400px', marginInline: 'auto' }}>
          Every tracked item is above its minimum reorder level.<br />
          Enjoy the peace of mind.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {createdOrders && createdOrders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{
          border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '12px', padding: '24px', marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <CheckCircle2 size={20} color="var(--accent-success)" />
            <strong style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-success)' }}>
              {createdOrders.length} Draft Purchase Order{createdOrders.length === 1 ? '' : 's'} Created
            </strong>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
            These are currently in draft status. You can review and adjust them before finalizing and sending to your suppliers.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {createdOrders.map(po => (
              <button
                key={po.id}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '10px 16px' }}
                onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
              >
                {po.poNumber} <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: '24px', flexWrap: 'wrap', marginBottom: '32px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>Action Required</h2>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>
            {data.summary.lineCount} item{data.summary.lineCount === 1 ? '' : 's'} are critically low
            {suppliers.length > 0 && ` across ${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: '1.2' }}>{money(selectedTotal)}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedCount} item{selectedCount === 1 ? '' : 's'} selected</div>
          </div>
          <button
            className="btn-primary"
            disabled={createDrafts.isPending || selectedCount === 0}
            onClick={handleCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '14px' }}
          >
            {createDrafts.isPending ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
            {createDrafts.isPending ? 'Generating...' : 'Create Draft Orders'}
          </button>
        </div>
      </div>

      {suppliers.map(group => (
        <motion.div
          key={group.supplier.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: 0, marginBottom: '24px', overflow: 'hidden' }}
        >
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <Truck size={20} color="var(--text-primary)" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{group.supplier.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Supplier Code: <span style={{ fontFamily: 'var(--font-mono)' }}>{group.supplier.supplierCode}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)', textAlign: 'right' }}>
              {group.lines.length} item{group.lines.length === 1 ? '' : 's'} <br/> 
              <strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{money(group.estimatedTotal)}</strong>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '24px' }}></th>
                <th>Item Details</th>
                <th style={{ textAlign: 'right' }}>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Reorder Threshold</th>
                <th style={{ textAlign: 'center' }}>Order Quantity</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {group.lines.map(line => {
                const st = stateFor(line);
                const qty = Number(st.qty) || 0;
                return (
                  <tr key={line.variantId} style={{ 
                    transition: 'all 0.2s ease',
                    opacity: st.selected ? 1 : 0.6,
                    backgroundColor: st.selected ? 'transparent' : 'var(--bg-input)'
                  }}>
                    <td style={{ paddingLeft: '24px', paddingRight: '8px' }}>
                      <input
                        type="checkbox"
                        checked={st.selected}
                        onChange={(e) => setLine(line.variantId, { selected: e.target.checked, qty: st.qty })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{line.productTitle}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{line.sku}</span>
                        {line.supplierSku && ` · Their Code: ${line.supplierSku}`}
                        {line.leadTimeDays != null && ` · ${line.leadTimeDays}d lead`}
                      </div>
                      {line.raisedToMinimum && (
                        <div style={{ fontSize: '12px', color: 'var(--accent-warning)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12}/> Auto-adjusted to minimum order: {line.minOrderQty}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)', fontWeight: 600, fontSize: '14px' }}>
                         {line.currentStock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '14px' }}>{line.reorderLevel}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={st.qty}
                        onChange={(e) => setLine(line.variantId, { selected: st.selected, qty: e.target.value })}
                        disabled={!st.selected}
                        style={{ 
                          width: '90px', textAlign: 'center', padding: '8px', borderRadius: '6px',
                          opacity: st.selected ? 1 : 0.5, cursor: st.selected ? 'text' : 'not-allowed'
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{money(line.unitPrice)}</td>
                    <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{money(qty * line.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      ))}

      {unassigned.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, border: '1px solid rgba(245, 158, 11, 0.2)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                 <AlertTriangle size={18} color="var(--accent-warning)" />
              </div>
              <strong style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Action Required: Unassigned Items ({unassigned.length})
              </strong>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '12px 0 0 46px', lineHeight: '1.5' }}>
              These items are critically low but have no associated supplier. We cannot auto-generate a draft order for them. <br/>
              Please raise a manual purchase order; the supplier will be linked for future restocks.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <tbody>
              {unassigned.map((line, index) => (
                <tr key={line.variantId} style={{ borderTop: index !== 0 ? '1px solid var(--border-light)' : 'none' }}>
                  <td style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{line.productTitle}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{line.sku}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      <span style={{ color: 'var(--accent-danger)' }}>{line.currentStock}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{line.reorderLevel}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                      onClick={() => navigate('/inventory/purchase-orders/new', {
                        state: {
                          variantId: line.variantId, sku: line.sku, title: line.productTitle,
                          orderedQty: line.suggestedQty, costPrice: line.unitPrice
                        }
                      })}
                    >
                      Create Manual Order
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
