import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

/**
 * Platform Console → client → Till (POS) (25 Nov 2026). Switching POS on makes the shop's till key and hands it to POS,
 * which makes (or joins) the shop's POS, brings in its items and makes the owner's login. The owner then opens the
 * one-time welcome link to choose a password and PIN. No key is pasted by hand.
 */
export default function ClientPosModule({ clientId }) {
  const qc = useQueryClient();
  const key = ['admin', 'clients', clientId, 'pos'];
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/admin/clients/${clientId}/pos`)).data, enabled: !!clientId, retry: false });
  const [shown, setShown] = useState(null); // the last answer with a welcome link, to hand to the owner
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(null);

  const fail = (e) => toast.error(e?.response?.data?.message ?? 'POS could not be changed just now. Please try again.');
  const done = (d, msg) => { toast.success(msg); if (d?.ownerLink || d?.posAddress) setShown(d); qc.invalidateQueries({ queryKey: key }); };
  const on = useMutation({ mutationFn: async () => (await api.post(`/admin/clients/${clientId}/pos/on`, {})).data, onSuccess: (d) => done(d, 'POS is on for this shop'), onError: fail });
  const off = useMutation({ mutationFn: async () => (await api.post(`/admin/clients/${clientId}/pos/off`, {})).data, onSuccess: () => { setShown(null); done(null, 'POS is off for this shop'); }, onError: fail });
  const link = useMutation({ mutationFn: async (reset) => (await api.post(`/admin/clients/${clientId}/pos/owner-link`, reset ? { reset: true } : {})).data, onSuccess: (d) => done(d, 'A new welcome link is ready'), onError: fail });

  const copy = async (what, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); }
    catch { toast.error('Could not copy. Select the link and copy it by hand.'); }
  };
  const busy = on.isPending || off.isPending || link.isPending;
  const box = { border: '1px solid var(--border-light)', borderRadius: '16px', marginTop: '24px', overflow: 'hidden', background: 'var(--bg-card)' };
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--border-light)', fontSize: '13.5px' };
  const address = shown?.posAddress ?? data?.posAddress ?? null;
  const welcome = shown?.ownerLink ?? null;

  return (
    <div style={box} data-testid="pos-module">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><Monitor size={17} /> Till (POS)</strong>
        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Billing at the shop's counter with ScaleEzy POS. Switching it on connects the shop's items, prices and GST, and makes the owner's POS login.
        </p>
      </div>
      <div style={{ padding: '14px 20px 18px' }}>
        {isLoading ? <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          : isError ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>POS could not be reached just now. <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => refetch()}>Try again</button></div>
          ) : data?.configured === false ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>POS is not set up on this server yet (its address and Inventory's service key).</div>
          ) : !data?.posOn ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13.5px' }}><strong>Off</strong><div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 2 }}>The shop's counter cannot bill with ScaleEzy POS yet.</div></div>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => on.mutate()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {on.isPending && <Loader2 size={15} className="animate-spin" />} Turn POS on
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingBottom: 10 }}>
                <div style={{ fontSize: '13.5px' }}><strong>On</strong>{data?.shop?.name ? `: ${data.shop.name}` : ''}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => link.mutate(false)}>New owner link</button>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmReset(true)}>Owner can't sign in</button>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmOff(true)}>Turn off</button>
                </div>
              </div>
              {address && (
                <div style={row}>
                  <span style={{ color: 'var(--text-secondary)' }}>POS address</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><code>{address}</code>
                    <button type="button" className="btn-secondary" onClick={() => copy('address', address)}>{copied === 'address' ? <CheckCircle2 size={14} /> : <Copy size={14} />}</button></span>
                </div>
              )}
              {welcome && (
                <div style={row}>
                  <span style={{ color: 'var(--text-secondary)' }}>Owner's welcome link <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>Works once: the owner chooses a password and PIN. Send it to them.</span></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><code style={{ overflowWrap: 'anywhere' }}>{welcome}</code>
                    <button type="button" className="btn-secondary" onClick={() => copy('link', welcome)}>{copied === 'link' ? <CheckCircle2 size={14} /> : <Copy size={14} />}</button></span>
                </div>
              )}
              {!welcome && <div style={{ ...row, color: 'var(--text-muted)' }}>The owner signs in at the POS address. "New owner link" makes a fresh welcome link to send them.</div>}
            </div>
          )}
      </div>
      <ConfirmModal isOpen={confirmOff} onClose={() => setConfirmOff(false)} onConfirm={async () => { await off.mutateAsync(); }}
        title="Turn POS off for this shop?" message="Every till of this shop closes at once and none can open. Bills, staff and settings are kept, and POS can be turned on again at any time."
        confirmText="Turn off" confirmStyle="danger" />
      <ConfirmModal isOpen={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={async () => { await link.mutateAsync(true); }}
        title="Reset the owner's POS password?" message="Their old password stops working, and the new welcome link lets them choose a new one. Any earlier link stops working."
        confirmText="Reset and make link" />
    </div>
  );
}
