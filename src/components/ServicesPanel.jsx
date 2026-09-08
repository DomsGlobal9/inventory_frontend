import React from 'react';
import { Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useMyServices } from '../hooks/useTeam';

/**
 * Settings -> APIs & Services, as a merchant sees it.
 *
 * Deliberately read-only. The key belongs to the platform, is issued in the gateway and pasted
 * in by Scaleezy -- so this screen shows that the service is on, and enough of the key to
 * recognise it in a support conversation, and nothing else.
 *
 * The value is not merely omitted here: the endpoint behind this returns a prefix and never
 * decrypts. Hiding it in the markup alone would look identical and be worth nothing, since
 * anyone can open the network tab.
 */

const ICONS = {
  CATALOG_TRYON: Sparkles
};

export default function ServicesPanel() {
  const { data: services = [], isLoading } = useMyServices();

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
        <h2 style={{ fontSize: '20px', margin: '0 0 6px', color: 'var(--text-primary)' }}>APIs & Services</h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
          Platform services switched on for this workspace. These are set up and looked after by
          Scaleezy — there is nothing to configure here.
        </p>
      </div>

      {services.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          border: '1px dashed var(--border-light)', borderRadius: '12px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            No platform services are switched on for this workspace yet.
          </p>
        </div>
      ) : (
        services.map(svc => {
          const Icon = ICONS[svc.id] ?? Sparkles;
          return (
            <div key={svc.id} style={{
              border: '1px solid var(--border-light)', borderRadius: '16px',
              padding: '22px', marginBottom: '16px', background: 'var(--bg-card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '14px', minWidth: '240px', flex: 1 }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(226,193,113,0.12)', color: 'var(--accent-gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '15px' }}>{svc.name}</strong>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, letterSpacing: '.04em',
                        color: svc.active ? 'var(--accent-success,#22c55e)' : 'var(--text-muted)'
                      }}>
                        {svc.active ? 'ACTIVE' : 'NOT ACTIVE'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {svc.description}
                    </p>
                  </div>
                </div>
              </div>

              {svc.active && (
                <div style={{
                  marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)',
                  display: 'flex', gap: '28px', flexWrap: 'wrap', fontSize: '12.5px'
                }}>
                  {/* Shown so a merchant can say "the one starting sk_live_a41f" to support and
                      be understood. Not enough to be used for anything. */}
                  {svc.keyPrefix && (
                    <div>
                      <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontSize: '11px', marginBottom: '3px' }}>
                        Key
                      </div>
                      <div style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{svc.keyPrefix}••••</div>
                    </div>
                  )}
                  <div>
                    <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontSize: '11px', marginBottom: '3px' }}>
                      Last used
                    </div>
                    <div>{svc.lastUsedAt ? new Date(svc.lastUsedAt).toLocaleDateString() : 'Not used yet'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={14} />
                    <span>Managed by {svc.managedBy}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
