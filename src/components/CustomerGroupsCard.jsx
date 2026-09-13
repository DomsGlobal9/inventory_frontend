import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * The groups a customer is in -- VIP, STAFF, WHOLESALE.
 *
 * This is what an offer "for some groups" checks, so it sits on the customer rather than on the
 * offer: a shop decides once that Meena is a VIP, and every VIP offer after that simply reaches her.
 * Suggestions come from the groups other customers are already in, so "VIP" is not also typed as
 * "V.I.P" and "vip customers" by three different people.
 */
export default function CustomerGroupsCard({ customer, canEdit }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const tags = customer.tags ?? [];

  const { data: options } = useQuery({
    queryKey: ['offers', 'options'],
    queryFn: () => api.get('/offers/options').then(r => r?.data ?? r),
    staleTime: 5 * 60 * 1000,
    enabled: canEdit,
    retry: false
  });

  const save = useMutation({
    mutationFn: (next) => api.patch(`/customers/${customer.id}`, { tags: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'options'] });
    },
    onError: (e) => toast.error(e?.message || 'Could not change the groups.')
  });

  const has = (t) => tags.some(x => x.toLowerCase() === t.trim().toLowerCase());
  const add = (t) => {
    const tag = t.trim().replace(/\s+/g, ' ');
    if (!tag || has(tag)) { setText(''); return; }
    if (tag.length > 40) return toast.error('Keep a group name under 40 characters.');
    save.mutate([...tags, tag]);
    setText('');
  };
  const suggestions = (options?.customerTags ?? [])
    .filter(t => !has(t.value) && (!text || t.value.toLowerCase().includes(text.trim().toLowerCase())))
    .slice(0, 6);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Groups {save.isPending && <Loader2 size={14} className="animate-spin" />}
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>Offers for a group reach everyone in it.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.length === 0 && <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>In no groups</span>}
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '2px', padding: '2px 2px 2px 10px', borderRadius: '999px', background: 'var(--bg-input)', fontSize: '13px' }}>
            {t}
            {canEdit && (
              <button type="button" aria-label={`Remove from ${t}`} disabled={save.isPending}
                onClick={() => save.mutate(tags.filter(x => x !== t))}
                // A full touch target on a phone, without making the pill two lines tall.
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', margin: '-6px 0', borderRadius: '999px', color: 'var(--text-secondary)' }}>
                <X size={13} />
              </button>
            )}
          </span>
        ))}
      </div>

      {canEdit && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); add(text); }} style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <input className="input-field" value={text} onChange={e => setText(e.target.value)} placeholder="Add to a group, e.g. VIP"
              aria-label="Add to a group" maxLength={40} style={{ flex: 1, minWidth: 0 }} />
            <button type="submit" className="btn-secondary" aria-label="Add group" disabled={!text.trim() || save.isPending} style={{ padding: '6px 10px' }}>
              <Plus size={15} />
            </button>
          </form>
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {suggestions.map(s => (
                <button key={s.value} type="button" onClick={() => add(s.value)} disabled={save.isPending}
                  style={{ border: '1px dashed var(--border-focus)', background: 'transparent', borderRadius: '999px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  + {s.value} <span style={{ opacity: 0.6 }}>{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
