import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Copy, Unlink, KeyRound, Loader2, Check } from 'lucide-react';
import { api } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

/**
 * Settings → Boutique (owner only; PLAN-boutique-sync.md). Which boutique uses this shop's products and stock, a
 * one-time code to link one, and Unlink. The server checks the owner too (routes/boutique-link.routes.ts).
 */
const KEY = ['boutique-link'];
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function BoutiquePanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/boutique-link')).data });
  const [code, setCode] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const fail = (e) => toast.error(e?.response?.data?.message ?? 'The request could not be completed. Please try again.');
  const make = useMutation({ mutationFn: async () => (await api.post('/boutique-link/code')).data, onSuccess: (d) => { setCode(d.code); setCopied(false); }, onError: fail });
  const unlink = useMutation({
    mutationFn: async () => (await api.delete('/boutique-link')).data,
    onSuccess: () => { toast.success('Boutique disconnected'); qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: ['shop-setup'] }); },
    onError: fail
  });

  if (isLoading || !data) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  const box = { border: '1px solid var(--border-light)', borderRadius: 14, padding: 18, display: 'grid', gap: 10 };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Boutique</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, maxWidth: 640 }}>
          Connect your ScaleEzy Boutique (stitching orders and tailoring) to share a single stock across your store, your
          online store and the boutique. Prices for boutique items are managed in the boutique.
        </p>
      </div>

      {data.linked ? (
        <div style={box}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div>
              <strong>Connected to {data.shopName || data.tenant}</strong>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Boutique account <code>{data.tenant}</code> · since {when(data.linkedAt)}</div>
            </div>
          </div>
          <div>
            <button type="button" className="btn-secondary" onClick={() => setConfirm(true)} disabled={unlink.isPending} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Unlink size={15} /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div style={box}>
          <strong>No boutique connected</strong>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Generate a connection code and enter it in your boutique under Settings → Connect to ScaleEzy Inventory. The code is valid once, for 30 minutes.
          </p>
          {code ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span aria-label="Link code" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 26, fontWeight: 800, letterSpacing: 3, padding: '8px 14px', borderRadius: 10, background: 'rgba(166, 217, 43, .16)', border: '1px dashed var(--brand-deep, #164B1E)' }}>{code}</span>
              <button type="button" className="btn-secondary" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}
                onClick={() => { navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {}); }}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Valid for 30 minutes, single use. Generating a new code replaces this one.</span>
            </div>
          ) : (
            <div>
              <button type="button" className="btn-primary" onClick={() => make.mutate()} disabled={make.isPending} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                {make.isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Generate connection code
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => { await unlink.mutateAsync(); setCode(null); }}
        title="Disconnect the boutique?"
        message="The boutique will no longer have access to your products and stock. Items already added will remain. You can reconnect at any time with a new code."
        confirmText="Disconnect"
        confirmStyle="danger"
      />
    </div>
  );
}
