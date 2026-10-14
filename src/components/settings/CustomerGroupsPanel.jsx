import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Plus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import ConfirmModal from '../ConfirmModal';

/**
 * Settings → Customers → Customer groups.
 *
 * Who is in VIP, STAFF, WHOLESALE, and what each group means for WhatsApp. Membership is the same
 * list the Groups card on a customer edits, so the two can never disagree; this screen adds the view
 * across all customers, rename/merge/delete, the message rules and auto-join by spend.
 */

const LIST = ['customer-groups'];
const enc = (key) => encodeURIComponent(key);
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function rulesText(g) {
  const out = [];
  if (g.noOfferMessages) out.push('No offer messages');
  if (g.noWishes) out.push('No wishes');
  if (g.autoMinSpend) out.push(`Joins at ${rupees(g.autoMinSpend)} in ${g.autoDays} days`);
  return out.join(' · ') || '—';
}

export default function CustomerGroupsPanel() {
  const { can } = usePermission();
  const canEdit = can('customer:update');
  // Members are customer:update; what a group means (rules, name, merge, delete) is manage_groups.
  const canManage = can('customer:manage_groups');
  const qc = useQueryClient();
  const [open, setOpen] = useState(null);
  const [newName, setNewName] = useState('');

  const { data: groups = [], isLoading } = useQuery({ queryKey: LIST, queryFn: async () => (await api.get('/customer-groups')).data || [] });
  const create = useMutation({
    mutationFn: async (name) => (await api.post('/customer-groups', { name })).data,
    onSuccess: (g) => { setNewName(''); setOpen(g.key); qc.invalidateQueries({ queryKey: LIST }); },
    onError: (e) => toast.error(e?.message || 'That group could not be made.')
  });

  return (
    <div>
      <h2 style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>Customer groups</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
        Groups such as VIP, Staff or Wholesale. Offers can be only for a group, campaigns can go to a group,
        and a group can be kept out of offer messages on WhatsApp.
      </p>

      {canManage && (
        <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate(newName.trim()); }}
          style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 220px', maxWidth: '320px' }}>
            <label className="input-label" htmlFor="cg-new">New group</label>
            <input id="cg-new" className="input-field" value={newName} maxLength={40} placeholder="VIP" onChange={e => setNewName(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending || !newName.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add group
          </button>
        </form>
      )}

      {isLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading groups…</p>
        : groups.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No groups yet. Make one above, or add a customer to a group from their page.
          </p>
        ) : (
          <div className="table-container" style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'auto hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)' }}>
                  {['Group', 'People', 'Rules'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <React.Fragment key={g.key}>
                    <tr style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <button type="button" aria-expanded={open === g.key} onClick={() => setOpen(open === g.key ? null : g.key)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {open === g.key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}{g.name}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{g.count}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{rulesText(g)}</td>
                    </tr>
                    {open === g.key && (
                      <tr><td colSpan={3} style={{ padding: '4px 14px 18px', background: 'var(--bg-input)' }}>
                        <GroupDetail group={g} groups={groups} canEdit={canEdit} canManage={canManage} onGone={() => setOpen(null)} onMoved={(key) => setOpen(key)} />
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function GroupDetail({ group: g, groups, canEdit, canManage, onGone, onMoved }) {
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: LIST }); qc.invalidateQueries({ queryKey: ['customer-groups', g.key] }); qc.invalidateQueries({ queryKey: ['customers'] }); };
  const fail = (fallback) => (e) => toast.error(e?.message || fallback);

  const [name, setName] = useState(g.name);
  const [into, setInto] = useState('');
  const [spend, setSpend] = useState(g.autoMinSpend ?? '');
  const [days, setDays] = useState(g.autoDays ?? 365);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: detail } = useQuery({ queryKey: ['customer-groups', g.key], queryFn: async () => (await api.get(`/customer-groups/${enc(g.key)}/members`)).data });
  const { data: found = [] } = useQuery({
    queryKey: ['customers', 'search', search],
    queryFn: async () => (await api.get('/customers', { params: { search } })) || [],
    enabled: canEdit && search.trim().length >= 2
  });
  const memberIds = new Set((detail?.members ?? []).map(m => m.id));

  const rules = useMutation({
    mutationFn: async (body) => (await api.patch(`/customer-groups/${enc(g.key)}/rules`, body)).data,
    // The tick shows at once; a save from Singapore takes a second or two and a box that does not
    // move looks broken. Put back if the save fails.
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: LIST });
      const before = qc.getQueryData(LIST);
      qc.setQueryData(LIST, (list = []) => list.map(x => (x.key === g.key ? { ...x, ...body } : x)));
      return { before };
    },
    onSuccess: (r) => { refresh(); if (r?.joined) toast.success(`${r.joined} customer${r.joined === 1 ? '' : 's'} added by the rule.`); },
    onError: (e, _body, ctx) => { if (ctx?.before) qc.setQueryData(LIST, ctx.before); fail('Those rules could not be saved.')(e); }
  });
  const rename = useMutation({
    mutationFn: async () => (await api.post(`/customer-groups/${enc(g.key)}/rename`, { name })).data,
    onSuccess: (r) => { refresh(); onMoved(r.key); toast.success('Renamed.'); },
    onError: fail('That group could not be renamed.')
  });
  const merge = useMutation({
    mutationFn: async () => (await api.post(`/customer-groups/${enc(g.key)}/merge`, { into })).data,
    onSuccess: (r) => { refresh(); onMoved(r.key); toast.success(`Merged into ${r.name}.`); },
    onError: fail('Those groups could not be merged.')
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete(`/customer-groups/${enc(g.key)}`)).data,
    onSuccess: () => { refresh(); onGone(); toast.success('Group deleted.'); },
    onError: fail('That group could not be deleted.')
  });
  const add = useMutation({
    mutationFn: async (id) => (await api.post('/customer-groups/members', { group: g.name, customerIds: [id] })).data,
    onSuccess: (r) => { refresh(); if (r?.full) toast.error('That customer is already in 20 groups, the most a customer can have.'); },
    onError: fail('That customer could not be added.')
  });
  const drop = useMutation({
    mutationFn: async (id) => (await api.delete(`/customer-groups/${enc(g.key)}/members/${id}`)).data,
    onSuccess: refresh, onError: fail('That customer could not be taken out.')
  });

  const box = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 16px', marginTop: '12px' };
  const others = groups.filter(o => o.key !== g.key);

  return (
    <div>
      {g.offers?.length > 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
          Used by {g.offers.length} offer{g.offers.length === 1 ? '' : 's'}: {g.offers.map(o => o.name).join(', ')}
        </p>
      )}

      {canManage && (<>
      <div style={box}>
        <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>WhatsApp</h3>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', marginBottom: '6px' }}>
          <input type="checkbox" checked={!!g.noOfferMessages} disabled={rules.isPending}
            onChange={e => rules.mutate({ noOfferMessages: e.target.checked })} />
          No offer messages <span style={{ color: 'var(--text-muted)' }}>(campaigns and the points-expiry reminder)</span>
        </label>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
          <input type="checkbox" checked={!!g.noWishes} disabled={rules.isPending}
            onChange={e => rules.mutate({ noWishes: e.target.checked })} />
          No birthday or anniversary wishes
        </label>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 0' }}>Bills sent from the till are not affected.</p>
      </div>

      <div style={box}>
        <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>Join by spending</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
          Customers who spend this much are added by themselves, checked every hour. Nobody is taken out by the rule.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="input-label" htmlFor={`cg-spend-${g.key}`}>Spent at least (₹)</label>
            <input id={`cg-spend-${g.key}`} className="input-field" type="number" min="1" value={spend} onChange={e => setSpend(e.target.value)} style={{ width: '160px' }} />
          </div>
          <div>
            <label className="input-label" htmlFor={`cg-days-${g.key}`}>In the last (days)</label>
            <input id={`cg-days-${g.key}`} className="input-field" type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)} style={{ width: '120px' }} />
          </div>
          <button type="button" className="btn-primary" disabled={rules.isPending || !spend}
            onClick={() => rules.mutate({ autoMinSpend: Number(spend), autoDays: Number(days) })}>Save rule</button>
          {g.autoMinSpend && (
            <button type="button" className="btn-secondary" disabled={rules.isPending}
              onClick={() => { setSpend(''); rules.mutate({ autoMinSpend: null, autoDays: null }); }}>Switch off</button>
          )}
        </div>
      </div>

      </>)}

      <div style={box}>
        <h3 style={{ fontSize: '15px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} /> Members ({detail?.members?.length ?? g.count})
        </h3>
        {canEdit && (
          <div style={{ marginBottom: '10px', maxWidth: '360px' }}>
            <label className="input-label" htmlFor={`cg-find-${g.key}`}>Add customers</label>
            <input id={`cg-find-${g.key}`} className="input-field" value={search} placeholder="Name or phone" onChange={e => setSearch(e.target.value)} />
            {search.trim().length >= 2 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', maxHeight: '180px', overflowY: 'auto' }}>
                {found.filter(c => !memberIds.has(c.id)).slice(0, 8).map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <span style={{ fontSize: '14px' }}>{c.name} <span style={{ color: 'var(--text-muted)' }}>{c.phone}</span></span>
                    <button type="button" className="btn-secondary" disabled={add.isPending} onClick={() => add.mutate(c.id)}>Add</button>
                  </li>
                ))}
                {found.filter(c => !memberIds.has(c.id)).length === 0 && <li style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No one else matches.</li>}
              </ul>
            )}
          </div>
        )}
        {(detail?.members ?? []).length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Nobody in this group yet.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {detail.members.map(m => (
              <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '14px' }}>{m.name} <span style={{ color: 'var(--text-muted)' }}>{m.phone || ''}</span></span>
                {canEdit && <button type="button" className="btn-secondary" disabled={drop.isPending} aria-label={`Take ${m.name} out of ${g.name}`} onClick={() => drop.mutate(m.id)}>Remove</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div style={{ ...box, display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div>
              <label className="input-label" htmlFor={`cg-name-${g.key}`}>Name</label>
              <input id={`cg-name-${g.key}`} className="input-field" value={name} maxLength={40} onChange={e => setName(e.target.value)} />
            </div>
            <button type="button" className="btn-secondary" disabled={rename.isPending || !name.trim() || name.trim() === g.name} onClick={() => rename.mutate()}>Rename</button>
          </div>
          {others.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div>
                <label className="input-label" htmlFor={`cg-into-${g.key}`}>Merge into</label>
                <select id={`cg-into-${g.key}`} className="input-field" value={into} onChange={e => setInto(e.target.value)}>
                  <option value="">Choose a group</option>
                  {others.map(o => <option key={o.key} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <button type="button" className="btn-secondary" disabled={merge.isPending || !into} onClick={() => merge.mutate()}>Merge</button>
            </div>
          )}
          <button type="button" className="btn-secondary" style={{ color: 'var(--accent-danger)' }} disabled={remove.isPending} onClick={() => setConfirmDelete(true)}>Delete group</button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); remove.mutate(); }}
        title={`Delete ${g.name}?`}
        message={`${g.count} customer${g.count === 1 ? '' : 's'} will no longer be in ${g.name}. The customers themselves are not deleted.`}
        confirmText="Delete group"
        confirmStyle="danger"
      />
    </div>
  );
}
