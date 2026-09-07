import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Store, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  useShopifyStatus, usePendingShopifyInstalls, useConnectShopify, useClaimShopify
} from '../hooks/useShopify';

/**
 * Connecting a Shopify store, from the merchant's side.
 *
 * Shopify is presented separately from a generic storefront because connecting it is a
 * genuinely different act. A generic storefront is a URL the merchant's developer built for us.
 * Shopify is an app the merchant installs, on Shopify, by approving a list of permissions --
 * they leave this page to do it and come back afterwards. Pretending the two are the same form
 * would mislead about what is going to happen next.
 */
export default function ShopifyPanel() {
  const { data: status, isLoading } = useShopifyStatus();
  const { data: pending = [] } = usePendingShopifyInstalls();
  const connect = useConnectShopify();
  const claim = useClaimShopify();

  const [shop, setShop] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * The merchant lands back here from Shopify, and the outcome is in the URL.
   *
   * Read once and then cleared: leaving it in the address bar means a refresh re-announces a
   * connection that happened ten minutes ago, and a shared link carries someone else's result.
   */
  useEffect(() => {
    const outcome = searchParams.get('shopify');
    if (!outcome) return;

    const shopParam = searchParams.get('shop');
    if (outcome === 'connected') {
      const missing = searchParams.get('missingScopes');
      toast.success(`${shopParam ?? 'Your store'} is connected.`);
      if (missing) {
        // Not a failure, but it will become one later in a way that looks like our bug, so it
        // is said now while the merchant is still here and can reconnect.
        toast.error(
          `Shopify did not grant: ${missing.split(',').join(', ')}. Some updates will not work ` +
          `until you reconnect and approve them.`,
          { duration: 14000 }
        );
      }
    } else if (outcome === 'claim') {
      toast(`${shopParam ?? 'A store'} installed the app. Confirm below that it is yours.`, { icon: '🔗' });
    } else if (outcome === 'failed') {
      toast.error(searchParams.get('reason') || 'The Shopify connection did not complete.', { duration: 12000 });
    }

    const next = new URLSearchParams(searchParams);
    ['shopify', 'shop', 'reason', 'missingScopes'].forEach(k => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const submit = (e) => {
    e.preventDefault();
    if (!shop.trim()) return;
    connect.mutate(shop.trim());
  };

  const card = {
    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
    borderRadius: '16px', padding: '24px', marginBottom: '20px'
  };

  if (isLoading) {
    return (
      <div style={card}>
        <Loader2 size={16} className="animate-spin" /> <span style={{ marginLeft: 8 }}>Checking Shopify…</span>
      </div>
    );
  }

  if (status) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Store size={18} />
          <strong style={{ fontSize: '15px' }}>{status.shopDomain}</strong>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
            color: status.tokenValid ? 'var(--accent-success, #22c55e)' : 'var(--accent-warning, #f59e0b)'
          }}>
            {status.tokenValid ? 'CONNECTED' : 'NEEDS RECONNECTING'}
          </span>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Your Shopify store is linked to this workspace. Products and stock will follow this
          inventory once the first sync has run.
        </p>

        {status.missingScopes?.length > 0 && (
          <div style={{
            display: 'flex', gap: '8px', padding: '12px', borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)', fontSize: '12.5px'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>
              Shopify did not grant <strong>{status.missingScopes.join(', ')}</strong>. Reconnect
              and approve them, or those updates will not reach your store.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <Store size={18} />
        <strong style={{ fontSize: '15px' }}>Shopify</strong>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Connect your Shopify store and it follows this inventory automatically. You will be taken
        to Shopify to approve the permissions, then brought back here.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          placeholder="your-store.myshopify.com"
          value={shop}
          onChange={e => setShop(e.target.value)}
          style={{ flex: 1, minWidth: '240px' }}
        />
        <button type="submit" className="btn-primary" disabled={connect.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {connect.isPending ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          {connect.isPending ? 'Opening Shopify…' : 'Connect Shopify'}
        </button>
      </form>

      {pending.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600 }}>
            Installed from Shopify, waiting to be claimed
          </p>
          {/* Nothing is synced to these until one is claimed. The domain is shown so a store is
              never claimed blind -- claiming the wrong one publishes this shop's inventory to
              somebody else's website. */}
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Only claim a store you recognise as yours.
          </p>
          {pending.map(p => (
            <div key={p.shopDomain}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px' }}>{p.shopDomain}</span>
              <button className="btn-secondary" disabled={claim.isPending}
                onClick={() => claim.mutate(p.shopDomain)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                {claim.isPending && claim.variables === p.shopDomain
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCircle2 size={14} />}
                This is my store
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
