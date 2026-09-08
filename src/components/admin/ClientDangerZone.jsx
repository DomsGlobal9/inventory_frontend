import React, { useState } from 'react';
import { AlertTriangle, Ban, Trash2, Loader2, RotateCcw } from 'lucide-react';
import {
  useSetClientSuspended, useClientDeletionPreview, useDeleteClient
} from '../../hooks/admin/useAdminConsole';

/**
 * Suspending and erasing a client.
 *
 * Modelled on GitHub's danger zone, and for the reason GitHub built it that way: destructive
 * actions should look different from everything around them, sit apart from the ordinary
 * controls, and be impossible to trigger with a single misplaced click.
 *
 * Two actions, ordered on purpose. Suspend is first and presented as the normal one, because
 * almost every real reason to cut a client off -- unpaid invoice, a dispute, suspected misuse
 * -- is temporary. Deleting to solve a billing problem destroys a shop's records forever.
 */

/**
 * The confirmation that requires typing the client id.
 *
 * Not a checkbox and not an "are you sure": both are dismissed reflexively by anyone who does
 * this more than once. Typing the id makes it impossible to erase the WRONG tenant while
 * meaning to erase a real one -- the mistake actually worth defending against here, since the
 * person clicking has already decided to delete something.
 */
function DeleteDialog({ clientId, preview, busy, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed === clientId;

  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={busy ? undefined : onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--accent-danger, #ef4444)',
        borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '19px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-danger,#ef4444)' }}>
          <Trash2 size={20} /> Erase {clientId}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This removes the workspace and everything in it from the database. There is no undo,
          no archive and no backup taken by this action.
        </p>

        {/* The abstraction made concrete. "Delete this client" is easy to click; "1,204
            products and 87 orders" is the last moment anyone notices they are on the wrong
            tenant's page. */}
        <div style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
            WHAT WILL BE DESTROYED
          </div>
          {preview ? (
            <>
              {row('Staff accounts', preview.users)}
              {row('Products', preview.products)}
              {row('Variants', preview.variants)}
              {row('Sales orders', preview.orders)}
              {row('Purchase orders', preview.purchaseOrders)}
              {row('Stock movements', preview.transactions)}
              {row('Locations', preview.locations)}
              {row('Suppliers', preview.suppliers)}
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Loader2 size={14} className="animate-spin" /> Counting…
            </div>
          )}
        </div>

        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Type <strong style={{ fontFamily: 'ui-monospace,Menlo,monospace', color: 'var(--text-primary)' }}>{clientId}</strong> to confirm
        </label>
        <input
          className="input-field" value={typed} onChange={e => setTyped(e.target.value)}
          placeholder={clientId} autoComplete="off" spellCheck={false}
          style={{ width: '100%', marginBottom: '18px', fontFamily: 'ui-monospace,Menlo,monospace' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onConfirm(typed)}
            disabled={!matches || busy || !preview}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '42px', padding: '0 18px',
              borderRadius: '8px', fontWeight: 600, cursor: matches && !busy ? 'pointer' : 'not-allowed',
              border: 'none',
              background: matches && !busy ? 'var(--accent-danger,#ef4444)' : 'var(--bg-input)',
              color: matches && !busy ? '#fff' : 'var(--text-muted)'
            }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {/* Named, because it takes a while: dozens of statements against a database in
                another region, and a silent pause here invites a second click on the most
                destructive button in the product. */}
            {busy ? 'Erasing — do not close this…' : 'I understand, erase this client'}
          </button>
          <button className="btn-secondary" onClick={onCancel} disabled={busy} style={{ minHeight: '42px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientDangerZone({ clientId, suspended }) {
  const suspend = useSetClientSuspended();
  const remove = useDeleteClient();

  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: preview } = useClientDeletionPreview(clientId, confirmDelete);

  const doDelete = async (confirmation) => {
    await remove.mutateAsync({ clientId, confirmation });
    setConfirmDelete(false);
    // Nothing left to show on this page -- the tenant it describes no longer exists.
    window.location.href = '/platformconsole/clients';
  };

  const box = {
    border: '1px solid var(--accent-danger, #ef4444)', borderRadius: '16px',
    marginTop: '32px', overflow: 'hidden'
  };
  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
    padding: '18px 20px', flexWrap: 'wrap'
  };

  return (
    <div style={box}>
      <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid var(--accent-danger,#ef4444)' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--accent-danger,#ef4444)' }}>
          <AlertTriangle size={17} /> Danger zone
        </strong>
      </div>

      {/* Suspend first, and deliberately: it is the reversible answer to nearly every reason
          someone arrives at this box. */}
      <div style={{ ...rowStyle, borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ minWidth: '260px', flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {suspended ? 'Reinstate this client' : 'Suspend this client'}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {suspended
              ? 'Their team will be able to sign in again. Storefronts stay paused until the shop turns them back on themselves.'
              : 'Nobody in the workspace can sign in, and connected storefronts stop receiving updates. Nothing is deleted, and it can be undone at any time.'}
          </p>
        </div>

        {suspended ? (
          <button className="btn-secondary" disabled={suspend.isPending}
            onClick={() => suspend.mutate({ clientId, suspended: false })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px' }}>
            {suspend.isPending ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            {suspend.isPending ? 'Reinstating…' : 'Reinstate'}
          </button>
        ) : confirmSuspend ? (
          // A second, deliberate click. Reversible, so it does not need typed confirmation --
          // but it does log every staff member out, which should not happen by brushing past.
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { suspend.mutate({ clientId, suspended: true }); setConfirmSuspend(false); }}
              disabled={suspend.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', padding: '0 16px', borderRadius: '8px', border: 'none', fontWeight: 600, background: 'var(--accent-warning,#f59e0b)', color: '#fff', cursor: 'pointer' }}>
              {suspend.isPending ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
              {suspend.isPending ? 'Suspending…' : 'Yes, suspend them'}
            </button>
            <button className="btn-secondary" onClick={() => setConfirmSuspend(false)} style={{ minHeight: '40px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setConfirmSuspend(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', color: 'var(--accent-warning,#f59e0b)' }}>
            <Ban size={15} /> Suspend
          </button>
        )}
      </div>

      <div style={rowStyle}>
        <div style={{ minWidth: '260px', flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Delete this client</div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Erases the workspace and every record in it — products, stock, orders, staff and
            history. This cannot be undone.
          </p>
        </div>
        <button onClick={() => setConfirmDelete(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', padding: '0 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid var(--accent-danger,#ef4444)', color: 'var(--accent-danger,#ef4444)' }}>
          <Trash2 size={15} /> Delete this client
        </button>
      </div>

      {confirmDelete && (
        <DeleteDialog
          clientId={clientId}
          preview={preview}
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
