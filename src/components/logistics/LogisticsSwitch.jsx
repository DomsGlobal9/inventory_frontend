import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { useLogistics } from './PackOrders';

/**
 * The shop's own switch for ScaleEzy Logistics (3 Nov).
 *
 * Until now only Logistics could switch a shop on, by calling us; the shop had no say and no way to see
 * it. On: Logistics may read this shop's products, and an order packed here goes to Logistics, who books
 * the courier. Off is refused by the server while parcels are still with Logistics, and that refusal is
 * shown as it is -- it says how many and what to wait for.
 *
 * Who manages the stores (admin:locations) flips it; anyone else sees whether it is on.
 */
const card = { padding: '20px 22px', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '20px' };
const hint = { fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 };

export default function LogisticsSwitch() {
  const { can } = usePermission();
  const mayFlip = can('admin:locations');
  const qc = useQueryClient();
  const { data, isLoading } = useLogistics(true);
  const on = data?.on === true;
  const open = data?.openParcels ?? 0;

  const flip = useMutation({
    mutationFn: async (next) => (await api.put('/logistics/on', { on: next })).data,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['logistics'] });
      toast.success(res?.on ? 'ScaleEzy Logistics is on. Packed orders now go to Logistics.' : 'ScaleEzy Logistics is off.');
    },
    onError: (err) => toast.error(err?.message || err?.response?.data?.message || 'That did not go through. Please try again.')
  });

  return (
    <div style={card} data-testid="logistics-switch">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Truck size={18} /> Ship with ScaleEzy Logistics</h3>
          <p style={hint}>
            {on
              ? 'On. Orders you pack go to ScaleEzy Logistics, who books the courier and sends tracking back here. Logistics can see your products to fill in shipments.'
              : 'Off. Switch on to have ScaleEzy Logistics book the courier for the orders you pack. Logistics will then be able to see your products.'}
          </p>
          {on && open > 0 ? (
            <p style={{ ...hint, color: 'var(--text-primary)' }}>
              {open} parcel{open === 1 ? ' is' : 's are'} with Logistics right now. You can switch off once {open === 1 ? 'it has' : 'they have'} been delivered or returned.
            </p>
          ) : null}
        </div>
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" aria-label="Loading" />
        ) : mayFlip ? (
          <button type="button" role="switch" aria-checked={on} aria-label="Ship with ScaleEzy Logistics" disabled={flip.isPending}
            onClick={() => flip.mutate(!on)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: on ? 'var(--accent-success, #16a34a)' : 'var(--text-secondary)' }}>
            {flip.isPending ? <Loader2 size={14} className="animate-spin" /> : (on ? 'On' : 'Off')}
            <span aria-hidden="true" style={{ width: '36px', height: '20px', borderRadius: '10px', position: 'relative', background: on ? 'var(--accent-success, #16a34a)' : 'var(--border-light)', transition: 'background .15s' }}>
              <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
            </span>
          </button>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>{on ? 'On' : 'Off'}</span>
        )}
      </div>
    </div>
  );
}
