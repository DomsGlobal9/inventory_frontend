import React, { useState } from 'react';
import { MonitorSmartphone, Loader2 } from 'lucide-react';
import { useSignOutOtherDevices } from '../hooks/useTeam';

/**
 * Settings -> General Info, for everybody: end every sign-in of this account except the one on this
 * screen. For a lost phone, a till left signed in, or a login someone else may have seen.
 *
 * Plain "Sign out" deliberately does not do this -- a shop sharing one login across tills would have
 * every till thrown out each time one cashier signed out. Asks once before acting, because a
 * shop that does share a login will sign its other tills out with it.
 */
export default function SignOutOtherDevices() {
  const signOut = useSignOutOtherDevices();
  const [confirming, setConfirming] = useState(false);

  const run = async () => {
    try {
      await signOut.mutateAsync();
    } catch {
      // Toasted by the hook.
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="gi-card" aria-labelledby="gi-devices-title">
      <div className="gi-pass-head">
        <div className="gi-head">
          <div className="gi-head-icon"><MonitorSmartphone size={18} /></div>
          <div>
            <h2 id="gi-devices-title">Other devices</h2>
            <p>{confirming
              ? 'Every other phone, till or browser signed in with this account will be signed out, including shared tills. You stay signed in here.'
              : 'Lost a phone, or left a till signed in? Sign this account out everywhere except here.'}</p>
          </div>
        </div>
        {!confirming ? (
          <button type="button" className="btn-secondary gi-btn" onClick={() => setConfirming(true)}>
            Sign out other devices
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary gi-btn" onClick={() => setConfirming(false)} disabled={signOut.isPending}>
              Cancel
            </button>
            <button type="button" className="btn-primary gi-btn" onClick={run} disabled={signOut.isPending}>
              {signOut.isPending ? <Loader2 size={15} className="animate-spin" /> : null} Sign them out
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
