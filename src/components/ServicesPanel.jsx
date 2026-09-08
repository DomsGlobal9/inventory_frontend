import React from 'react';
import { Loader2, Sparkles, ShieldCheck, QrCode } from 'lucide-react';
import { useMyServices, useMyTryOnUsage } from '../hooks/useTeam';

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
  CATALOG_TRYON: Sparkles,
  SHOPPER_TRYON: QrCode
};

/**
 * This month's usage against the allowance.
 *
 * Shown before it matters, not at the moment of refusal. A merchant stopped by a number they
 * were never shown has no way to understand it and nothing to do about it; a merchant who
 * watched it fill up can ask for more before they are stuck.
 */
/**
 * What a unit of each service is called, in the merchant's terms.
 *
 * The two are counted the same way and mean different things: a catalog generation produces
 * four views of a garment, a shopper try-on produces one picture of one customer. Calling both
 * "generations" would be accurate and useless.
 */
const UNIT_FOR = {
  CATALOG_TRYON: { noun: 'generations', showViews: true },
  SHOPPER_TRYON: { noun: 'try-ons', showViews: false }
};

function UsageBar({ usage, unit = UNIT_FOR.CATALOG_TRYON }) {
  if (!usage) return null;

  const limited = usage.monthlyLimit !== null;
  const fraction = limited ? Math.min(usage.generations / usage.monthlyLimit, 1) : 0;
  const tone = usage.overLimit
    ? 'var(--accent-danger,#ef4444)'
    : usage.approachingLimit ? 'var(--accent-warning,#f59e0b)' : 'var(--accent-success,#22c55e)';

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>This month</span>
        <strong>
          {usage.generations}{limited ? ` of ${usage.monthlyLimit}` : ''} {unit.noun}
        </strong>
      </div>

      {limited && (
        <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-input)', overflow: 'hidden' }}>
          <div style={{ width: `${fraction * 100}%`, height: '100%', background: tone, transition: 'width .3s' }} />
        </div>
      )}

      {usage.overLimit && (
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--accent-danger,#ef4444)' }}>
          You have used this month's allowance. Ask Scaleezy to raise it to carry on generating.
        </p>
      )}
      {usage.approachingLimit && (
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--accent-warning,#f59e0b)' }}>
          {usage.remaining} left this month. Ask Scaleezy to raise it before you run out.
        </p>
      )}

      {/* Views are shown separately because they are what the merchant actually received. A
          run that produced three of four is visible here rather than rounded up. */}
      <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
        {/* Views are shown for the catalog service because a run that produced three of four
            is a real outcome the merchant should see. A shopper try-on is one picture, so the
            count would only ever repeat the number above it. */}
        {unit.showViews ? `${usage.viewsGenerated} views produced` : `${usage.completed} completed`}
        {usage.failed > 0 ? ` · ${usage.failed} run${usage.failed === 1 ? '' : 's'} failed` : ''}
        {usage.cancelled > 0 ? ` · ${usage.cancelled} cancelled (not counted)` : ''}
      </p>
    </div>
  );
}

export default function ServicesPanel() {
  const { data: services = [], isLoading } = useMyServices();
  // One query per service. They are metered separately, so they are fetched separately --
  // sharing one would put one service's numbers under the other's heading.
  const { data: catalogUsage } = useMyTryOnUsage('CATALOG_TRYON');
  const { data: shopperUsage } = useMyTryOnUsage('SHOPPER_TRYON');
  const usageFor = { CATALOG_TRYON: catalogUsage, SHOPPER_TRYON: shopperUsage };

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
                    {/* `lastUsedAt` is stamped on the shop's OWN key. A shop running on the
                        platform's shared key has no key row to stamp, so this said "Not used
                        yet" directly above "2 try-ons this month" -- both figures individually
                        correct and together nonsense. The meter is the better witness: it
                        counts what the shop actually did, whichever key carried it. */}
                    <div>
                      {svc.lastUsedAt
                        ? new Date(svc.lastUsedAt).toLocaleDateString()
                        : usageFor[svc.id]?.generations > 0 ? 'Used this month' : 'Not used yet'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={14} />
                    <span>Managed by {svc.managedBy}</span>
                  </div>
                </div>
              )}

              {svc.active && <UsageBar usage={usageFor[svc.id]} unit={UNIT_FOR[svc.id]} />}
            </div>
          );
        })
      )}
    </div>
  );
}
