import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';

/**
 * Who is waiting for something that was sold out.
 *
 * A shopper who wanted a piece that had gone is the one customer a shop never hears about:
 * they arrived, they wanted it, and they left. The shop page now lets them leave a number, and
 * this is where that lands -- on the screen the shop opens first, because a waiting list nobody
 * ever looks at is the same as no waiting list.
 *
 * NOTHING HERE IS AUTOMATIC. No message is sent when stock returns; there is no such watcher,
 * and a button promising one would be a lie told to a customer. The shop sees the number and
 * rings it, which for a saree shop -- where one piece is often literally one piece -- is the
 * better call anyway.
 *
 * Renders nothing at all when nobody is waiting. A dashboard tile that says "0" every day for
 * months is a tile people stop seeing.
 */
export default function WaitingWidget() {
  const { can } = usePermission();
  const queryClient = useQueryClient();

  // These are customers' phone numbers, so the endpoint requires admin:online_shop. Anyone
  // without it simply does not get the widget -- not an error, which would be telling them
  // about something they may not read.
  const allowed = can('admin:online_shop');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-waiting'],
    queryFn: () => api.get('/online-shop/waiting'),
    enabled: allowed,
    staleTime: 60_000
  });

  const handled = useMutation({
    mutationFn: (id) => api.post(`/online-shop/waiting/${id}/handled`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-waiting'] }),
    onError: (e) => toast.error(e?.message || 'Could not mark that one done.')
  });

  const rows = data?.data ?? [];
  // Quiet unless there is something to act on -- including while loading and if it failed,
  // because a shop does not need to be told the waiting list could not be fetched.
  if (!allowed || isLoading || isError || rows.length === 0) return null;

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Waiting for something you had sold out of
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          {rows.length === 1 ? 'One customer' : `${rows.length} customers`} asked for a piece that had gone.
          Ring them &mdash; nothing is sent automatically.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
        {rows.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '10px'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {r.name || 'Someone'} &middot;{' '}
                {/* A tap on a phone dials it. That is the whole action this widget exists for. */}
                <a href={`tel:${r.phone}`} style={{ color: 'inherit' }}>{r.phone}</a>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {r.title}{r.piece ? ` — ${r.piece}` : ''} &middot;{' '}
                {new Date(r.askedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: '5px 12px', fontSize: '12px', flexShrink: 0 }}
              disabled={handled.isPending}
              onClick={() => handled.mutate(r.id)}
            >
              Done
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
