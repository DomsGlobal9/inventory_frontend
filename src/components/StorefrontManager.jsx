import React, { useState } from 'react';
import {
  Globe, Plus, Loader2, CheckCircle2, AlertTriangle, Copy, KeyRound,
  Pause, Play, Trash2, RefreshCw, Send, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useStorefrontConnections, useStorefrontDeliveries, useCreateConnection,
  useConnectionLifecycle, useRotateCredential, useTestConnection, useRetryDelivery
} from '../hooks/useStorefront';
import { useLocationContext } from '../contexts/LocationContext';
import ConfirmModal from './ConfirmModal';
import ShopifyPanel from './ShopifyPanel';

/**
 * Connecting a website to the shop.
 *
 * The promise this screen makes is "connect once and it stays in step", so it deliberately
 * does not offer a Sync button. What it does offer is the ability to see whether that promise
 * is being kept: a delivery log with the reason for every failure, and a test that sends a
 * real event through the real pipeline rather than a special-cased ping.
 */

const STATUS_STYLE = {
  ACTIVE: { label: 'Connected', color: 'var(--accent-success)' },
  PENDING_SYNC: { label: 'Waiting for first sync', color: 'var(--accent-gold)' },
  DISABLED: { label: 'Paused', color: 'var(--text-muted)' },
  REVOKED: { label: 'Revoked', color: 'var(--accent-danger)' }
};

const DELIVERY_STYLE = {
  DELIVERED: { label: 'Delivered', color: 'var(--accent-success)' },
  PENDING: { label: 'Queued', color: 'var(--text-muted)' },
  PROCESSING: { label: 'Sending', color: 'var(--accent-gold)' },
  RETRYING: { label: 'Retrying', color: 'var(--accent-warning)' },
  DEAD_LETTER: { label: 'Given up', color: 'var(--accent-danger)' },
  CANCELLED: { label: 'Cancelled', color: 'var(--text-muted)' }
};

export default function StorefrontManager() {
  const { data: connections = [], isLoading } = useStorefrontConnections();
  const { locations = [] } = useLocationContext();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', baseUrl: '', locationIds: [] });
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirm, setConfirm] = useState({ isOpen: false });

  const createMutation = useCreateConnection();
  const lifecycle = useConnectionLifecycle();
  const rotate = useRotateCredential();
  const test = useTestConnection();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    const result = await createMutation.mutateAsync({
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      locationIds: form.locationIds
    });
    // Shown, not toasted: this is the only time the secret exists in readable form, so it must
    // stay on screen until the merchant has deliberately dismissed it.
    setRevealedSecret({ secret: result.secret, name: form.name.trim() });
    setForm({ name: '', baseUrl: '', locationIds: [] });
    setShowForm(false);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  };

  const toggleLocation = (id) => setForm(f => ({
    ...f,
    locationIds: f.locationIds.includes(id)
      ? f.locationIds.filter(x => x !== id)
      : [...f.locationIds, id]
  }));

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', margin: '0 0 6px', color: 'var(--text-primary)' }}>Storefront</h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
          Connect your website and it stays up to date on its own -- products, prices, photos and
          stock. There is nothing to export and nothing to press afterwards.
        </p>
      </div>

      {/* Shopify first, and separate. Connecting it is a different act from adding a generic
          storefront: the merchant leaves for Shopify, approves permissions there, and comes
          back -- so presenting it as another row in the same list would misdescribe it. */}
      <ShopifyPanel />

      {revealedSecret && (
        <SecretPanel
          secret={revealedSecret.secret}
          name={revealedSecret.name}
          onCopy={copy}
          onDismiss={() => setRevealedSecret(null)}
        />
      )}

      {connections.length === 0 && !showForm && (
        <div style={{
          padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--border-light)',
          borderRadius: '12px', marginBottom: '20px'
        }}>
          <Globe size={38} style={{ opacity: 0.3, marginBottom: '14px' }} />
          <h3 style={{ fontSize: '16px', margin: '0 0 8px', color: 'var(--text-primary)' }}>
            No storefront connected yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>
            Connect one and your website will follow this inventory automatically.
          </p>
          <button className="btn-primary" onClick={() => setShowForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Connect a storefront
          </button>
        </div>
      )}

      {connections.map(connection => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          locations={locations}
          expanded={expandedId === connection.id}
          onToggle={() => setExpandedId(expandedId === connection.id ? null : connection.id)}
          onTest={() => test.mutate(connection.id)}
          testing={test.isPending && test.variables === connection.id}
          // Pausing takes several seconds against a database in another region, and until now
          // the button said "Pause" the whole time and stayed clickable -- so it looked as
          // though the click had missed, and the natural response is to click it again.
          busy={
            (lifecycle.isPending && lifecycle.variables?.id === connection.id) ||
            (rotate.isPending && rotate.variables === connection.id)
          }
          onLifecycle={(action) => {
            if (action === 'revoke') {
              setConfirm({
                isOpen: true,
                title: 'Revoke this connection',
                message:
                  `"${connection.name}" will stop receiving updates immediately and its key can never ` +
                  `be used again. Its delivery history is kept.\n\nThis cannot be undone -- reconnecting ` +
                  `means creating a new connection and re-syncing the catalogue.`,
                confirmText: 'Revoke',
                onConfirm: () => lifecycle.mutateAsync({ id: connection.id, action: 'revoke' })
              });
            } else {
              lifecycle.mutate({ id: connection.id, action });
            }
          }}
          onRotate={async () => {
            const result = await rotate.mutateAsync(connection.id);
            setRevealedSecret({ secret: result.secret, name: connection.name });
          }}
        />
      ))}

      {showForm ? (
        <form onSubmit={submit} className="glass-panel" style={{ padding: '24px', marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: '16px', color: 'var(--text-primary)' }}>
            Connect a storefront
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Name
            </label>
            <input
              className="input-field" style={{ width: '100%' }}
              placeholder="My website"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Just for you, so you can tell several apart.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Where should we send updates?
            </label>
            <input
              className="input-field" style={{ width: '100%' }}
              placeholder="https://your-website.com/scaleezy/webhook"
              value={form.baseUrl}
              onChange={e => setForm({ ...form, baseUrl: e.target.value })}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
              The address on your website that receives updates. Your developer will know it. It
              must start with https.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              <MapPin size={14} /> Which locations does this website sell from?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {locations.map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.locationIds.includes(l.id)}
                    onChange={() => toggleLocation(l.id)}
                  />
                  {l.name} <span style={{ color: 'var(--text-muted)' }}>({l.code})</span>
                </label>
              ))}
            </div>
            {/* The single most consequential field on this form, and the one a merchant is
                least likely to think about -- so it says what happens either way. */}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0 0' }}>
              The website shows stock from the locations you tick, and their prices. Leave them all
              unticked to sell from every location.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {createMutation.isPending ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      ) : connections.length > 0 && (
        <button className="btn-secondary" onClick={() => setShowForm(true)}
          style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Connect another storefront
        </button>
      )}

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        onConfirm={() => { confirm.onConfirm?.(); setConfirm({ isOpen: false }); }}
        onClose={() => setConfirm({ isOpen: false })}
      />
    </div>
  );
}

/** Shown once, and only once. Deliberately hard to dismiss by accident. */
function SecretPanel({ secret, name, onCopy, onDismiss }) {
  return (
    <div style={{
      padding: '20px', borderRadius: '12px', marginBottom: '20px',
      background: 'rgba(226,193,113,0.10)', border: '1px solid rgba(226,193,113,0.4)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <KeyRound size={16} color="var(--accent-gold)" />
        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
          Key for "{name}" -- copy it now
        </strong>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
        This is the only time it can be shown. We keep a one-way fingerprint of it, not the key
        itself, so it cannot be looked up later. Give it to whoever builds your website. If it is
        lost, issue a new one -- that immediately stops the old one working.
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
        background: 'var(--bg-input)', borderRadius: '8px', fontFamily: 'monospace',
        fontSize: '13px', wordBreak: 'break-all', color: 'var(--text-primary)'
      }}>
        <span style={{ flex: 1 }}>{secret}</span>
        <button className="btn-secondary" onClick={() => onCopy(secret)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Copy size={14} /> Copy
        </button>
      </div>
      <button className="btn-secondary" onClick={onDismiss} style={{ marginTop: '12px' }}>
        I have saved it
      </button>
    </div>
  );
}

function ConnectionCard({ connection, locations, expanded, onToggle, onTest, testing, busy, onLifecycle, onRotate }) {
  const status = STATUS_STYLE[connection.status] || { label: connection.status, color: 'var(--text-muted)' };
  const scoped = connection.locationIds?.length
    ? locations.filter(l => connection.locationIds.includes(l.id)).map(l => l.name).join(', ')
    : 'All locations';
  const revoked = connection.status === 'REVOKED';

  return (
    <div className="glass-panel" style={{ padding: 0, marginBottom: '14px', overflow: 'hidden', opacity: revoked ? 0.65 : 1 }}>
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Globe size={16} color="var(--accent-gold)" />
            <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{connection.name}</strong>
            <span style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px',
              borderRadius: '999px', color: status.color, border: `1px solid ${status.color}`
            }}>
              {status.label.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {connection.baseUrl}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span><MapPin size={11} style={{ verticalAlign: '-1px' }} /> {scoped}</span>
            <span>Key {connection.credentialPrefix}…</span>
            {connection.lastDeliveryAt && (
              <span>Last update sent {new Date(connection.lastDeliveryAt).toLocaleString('en-IN')}</span>
            )}
          </div>

          {connection.status === 'PENDING_SYNC' && (
            <p style={{ fontSize: '12.5px', color: 'var(--accent-gold)', margin: '10px 0 0' }}>
              Waiting for your website to fetch the catalogue for the first time. Updates are being
              held until it has -- telling it a price changed before it has the product would not help.
            </p>
          )}
        </div>

        {!revoked && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={onTest} disabled={testing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {testing ? 'Testing…' : 'Send test'}
            </button>
            <button className="btn-secondary" onClick={onRotate} disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              title="Issue a new key and stop the old one working">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} New key
            </button>
            {connection.status === 'DISABLED' ? (
              <button className="btn-secondary" onClick={() => onLifecycle('enable')} disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {busy ? 'Working…' : 'Resume'}
              </button>
            ) : (
              <button className="btn-secondary" onClick={() => onLifecycle('disable')} disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                {busy ? 'Working…' : 'Pause'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => onLifecycle('revoke')} disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-danger)' }}>
              <Trash2 size={14} /> Revoke
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '10px 20px', background: 'transparent', border: 'none',
          borderTop: '1px solid var(--border-light)', color: 'var(--text-secondary)',
          fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide' : 'Show'} what has been sent
      </button>

      {expanded && <DeliveryLog connectionId={connection.id} />}
    </div>
  );
}

function DeliveryLog({ connectionId }) {
  const { data: deliveries = [], isLoading } = useStorefrontDeliveries(connectionId);
  const retry = useRetryDelivery();

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Nothing sent yet. Changes to stock, prices and products will appear here as they happen.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            {['What', 'Item', 'Status', 'Tries', 'When', ''].map((h, i) => (
              <th key={h || i} style={{
                padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap'
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deliveries.map(d => {
            const style = DELIVERY_STYLE[d.status] || { label: d.status, color: 'var(--text-muted)' };
            const failed = d.status === 'DEAD_LETTER' || d.status === 'RETRYING';
            return (
              <tr key={d.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '11px 20px', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {String(d.event?.eventType || '').replace(/_/g, ' ').toLowerCase()}
                </td>
                <td style={{ padding: '11px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {d.event?.sku || d.event?.productCode || '—'}
                </td>
                <td style={{ padding: '11px 20px', fontSize: '13px', color: style.color, whiteSpace: 'nowrap' }}>
                  {style.label}
                  {d.lastResponseStatus ? ` (${d.lastResponseStatus})` : ''}
                  {/* The reason, in the row, rather than hidden behind a click. A delivery log
                      that says only "failed" sends the merchant to support. */}
                  {failed && d.lastError && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', maxWidth: '320px', whiteSpace: 'normal' }}>
                      {d.lastError}
                    </div>
                  )}
                </td>
                <td style={{ padding: '11px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {d.attempts}
                </td>
                <td style={{ padding: '11px 20px', fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(d.createdAt).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '11px 20px' }}>
                  {failed || d.status === 'CANCELLED' ? (
                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => retry.mutate({ deliveryId: d.id, connectionId })}>
                      Send again
                    </button>
                  ) : d.status === 'DELIVERED' ? (
                    <CheckCircle2 size={15} color="var(--accent-success)" />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
