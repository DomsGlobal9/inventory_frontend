import React, { useState } from 'react';
import { KeyRound, Loader2, Check, Plug, Unplug } from 'lucide-react';
import {
  useClientServiceKeys, useSetClientServiceKey, useRevokeClientServiceKey,
  useClientTryOnUsage, useSetClientTryOnLimit
} from '../../hooks/admin/useAdminConsole';

/**
 * A client's keys for platform services, on their console page.
 *
 * The flow this screen exists for: generate the key in the gateway, paste it here, and this
 * shop's try-on calls start arriving at the gateway under their own identity instead of the
 * platform's shared one.
 *
 * The key is checked against the gateway before it is saved, so a paste that dropped a
 * character is refused here -- with the reason -- rather than discovered later by a merchant
 * pressing Generate and meeting a 401.
 */

const SERVICE_LABELS = {
  CATALOG_TRYON: 'Virtual Try-On'
};

/**
 * This client's usage, and the allowance an admin can set.
 *
 * Sits above the key rather than below it because it is the question actually being asked when
 * someone opens this page -- "how much are they using" comes up far more often than "what is
 * their key".
 *
 * A blank field means unlimited, and zero means zero. Those are opposite intentions and the
 * input keeps them apart rather than treating an empty box as a number.
 */
function UsageAndLimit({ clientId }) {
  const { data, isLoading } = useClientTryOnUsage(clientId);
  const setLimit = useSetClientTryOnLimit();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (isLoading || !data?.summary) return null;
  const u = data.summary;

  const save = async (e) => {
    e.preventDefault();
    await setLimit.mutateAsync({
      clientId,
      monthlyLimit: value.trim() === '' ? null : Number(value.trim())
    });
    setEditing(false);
  };

  return (
    <div style={{
      background: 'var(--bg-input)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px' }}>
          <strong>{u.generations}</strong>
          {u.monthlyLimit === null ? ' generations' : ` of ${u.monthlyLimit}`} this month
          <span style={{ color: 'var(--text-muted)' }}>
            {' · '}{u.viewsGenerated} views
            {u.failed > 0 ? ` · ${u.failed} failed` : ''}
            {u.cancelled > 0 ? ` · ${u.cancelled} cancelled` : ''}
          </span>
        </div>

        {!editing && (
          <button className="btn-secondary" style={{ fontSize: '12.5px', minHeight: '34px', padding: '0 12px' }}
            onClick={() => { setEditing(true); setValue(u.monthlyLimit === null ? '' : String(u.monthlyLimit)); }}>
            {u.monthlyLimit === null ? 'Set a limit' : 'Change limit'}
          </button>
        )}
      </div>

      {/* Unlimited is a real state, and a quiet one -- try-on is GPU work, so a client with no
          ceiling is worth naming rather than leaving as an absence on the screen. */}
      {u.monthlyLimit === null && !editing && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          No limit set — this client can generate without a ceiling.
        </p>
      )}
      {u.overLimit && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--accent-danger,#ef4444)' }}>
          Over the limit. Their generations are being refused.
        </p>
      )}

      {editing && (
        <form onSubmit={save} style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <input className="input-field" type="number" min="0" value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Blank for unlimited"
            style={{ flex: 1, minWidth: '160px' }} />
          <button type="submit" className="btn-primary" disabled={setLimit.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '38px' }}>
            {setLimit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)} style={{ minHeight: '38px' }}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

export default function ClientServiceKeys({ clientId }) {
  const { data: services = [], isLoading } = useClientServiceKeys(clientId);
  const save = useSetClientServiceKey();
  const revoke = useRevokeClientServiceKey();

  const [editing, setEditing] = useState(null);
  const [key, setKey] = useState('');

  const submit = async (e, service) => {
    e.preventDefault();
    if (!key.trim()) return;
    await save.mutateAsync({ clientId, service, key: key.trim() });
    setKey('');
    setEditing(null);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid var(--border-light)', borderRadius: '16px',
      marginTop: '24px', overflow: 'hidden', background: 'var(--bg-card)'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
          <KeyRound size={17} /> Service keys
        </strong>
        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Generate the key in the gateway, then paste it here. Until one is set, this client
          uses the platform's shared key and their usage cannot be told apart.
        </p>
      </div>

      {services.map(svc => (
        <div key={svc.service} style={{ padding: '18px 20px' }}>
          {svc.service === 'CATALOG_TRYON' && <UsageAndLimit clientId={clientId} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '240px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <strong style={{ fontSize: '14px' }}>{SERVICE_LABELS[svc.service] ?? svc.service}</strong>
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '.04em',
                  color: svc.configured ? 'var(--accent-success,#22c55e)' : 'var(--text-muted)'
                }}>
                  {svc.configured ? 'OWN KEY' : svc.usingSharedFallback ? 'SHARED KEY' : 'NOT AVAILABLE'}
                </span>
              </div>

              {svc.configured ? (
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {/* The prefix, which is all the server will ever return. */}
                  <div style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{svc.keyPrefix}••••</div>
                  <div style={{ marginTop: '4px' }}>
                    Added by {svc.addedByAdmin}
                    {svc.addedAt ? ` on ${new Date(svc.addedAt).toLocaleDateString()}` : ''}
                    {svc.lastUsedAt
                      ? ` · last used ${new Date(svc.lastUsedAt).toLocaleDateString()}`
                      : ' · not used yet'}
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {svc.usingSharedFallback
                    ? 'Running on the shared key. Working, but their usage is counted with everyone else’s.'
                    : 'No key for this client, and no shared key on this deployment.'}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {editing === svc.service ? null : (
                <button className="btn-secondary" onClick={() => { setEditing(svc.service); setKey(''); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '38px' }}>
                  <Plug size={14} /> {svc.configured ? 'Replace key' : 'Add key'}
                </button>
              )}
              {svc.configured && editing !== svc.service && (
                <button className="btn-secondary" disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ clientId, service: svc.service })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '38px', color: 'var(--accent-warning,#f59e0b)' }}>
                  {revoke.isPending ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {editing === svc.service && (
            <form onSubmit={e => submit(e, svc.service)} style={{ marginTop: '14px' }}>
              <input
                className="input-field" value={key} onChange={e => setKey(e.target.value)}
                placeholder="Paste the key generated in the gateway"
                autoComplete="off" spellCheck={false}
                style={{ width: '100%', fontFamily: 'ui-monospace,Menlo,monospace', marginBottom: '10px' }}
              />
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                It is checked against the gateway before it is saved. A key that does not work
                is refused here rather than failing later in front of the merchant.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn-primary" disabled={!key.trim() || save.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px' }}>
                  {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {save.isPending ? 'Checking with the gateway…' : 'Save key'}
                </button>
                <button type="button" className="btn-secondary"
                  onClick={() => { setEditing(null); setKey(''); }} style={{ minHeight: '40px' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
