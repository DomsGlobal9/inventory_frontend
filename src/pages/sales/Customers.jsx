import React, { useState, useEffect } from 'react';
import LoadFailed from '../../components/LoadFailed';
import { useCustomers } from '../../hooks/useCustomers';
import { Search, Plus, IdCard, Gift } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerModal from '../../components/sales/CustomerModal';
import { usePermission } from '../../hooks/usePermission';
import { formatPhone } from '../../utils/phone';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CUSTOMER_STATUS, StatusPill } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import Select from '../../components/common/Select';


export default function Customers() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  // The search sent to the server waits for typing to pause: a phone number is ten keystrokes, and
  // each one used to be its own request.
  const [search, setSearch] = useState('');
  // ?new=1 (the Dashboard's + Customer) opens the form at once; the address is then tidied, so a refresh
  // does not open it again.
  const [linkParams, setLinkParams] = useSearchParams();
  const [adding, setAdding] = useState(() => linkParams.get('new') === '1');
  React.useEffect(() => { if (linkParams.get('new')) setLinkParams(p => { p.delete('new'); return p; }, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A card per customer on a phone. The table was 774px wide, so STATUS and the View button --
  // the only way into a customer -- sat off the right edge of a 390px screen.
  const narrow = useMediaQuery('(max-width: 760px)');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /*
   * No status filter. It offered Active, Inactive and Archived, but nothing in ScaleEzy can make a
   * customer inactive or archived -- the form has no such control and there is no archive action --
   * so two of its three choices always answered "No customers found", and the third was the same
   * list as no filter at all. A filter with nothing to filter was only a way to hide customers.
   */
  const [group, setGroup] = useState('');
  const { data: customers, isLoading, isError, error, refetch } = useCustomers({ search, group });

  // Groups: filter the list by one, and put ticked customers in one (an existing group or a new name).
  const canGroup = can('customer:update');
  const queryClient = useQueryClient();
  const { data: groups = [] } = useQuery({ queryKey: ['customer-groups'], queryFn: async () => (await api.get('/customer-groups')).data || [] });
  const [picked, setPicked] = useState(() => new Set());
  const [target, setTarget] = useState('');
  useEffect(() => { setPicked(new Set()); }, [search, group]);
  const toggle = (id) => setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const addToGroup = useMutation({
    mutationFn: async () => (await api.post('/customer-groups/members', { group: target, customerIds: [...picked] })).data,
    onSuccess: (r) => {
      const rest = [
        r.alreadyIn && `${r.alreadyIn} already in it`,
        r.full && `${r.full} already in 20 groups, the most a customer can have`,
        r.notFound && `${r.notFound} no longer here`
      ].filter(Boolean);
      toast.success(`${r.added} added to ${r.name}${rest.length ? ` (${rest.join(', ')})` : ''}.`);
      setPicked(new Set()); setTarget('');
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e) => toast.error(e?.message || 'Those customers could not be added.')
  });
  const getStatusBadge = (status) => <StatusPill map={CUSTOMER_STATUS} value={status} />;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your customer database and view order history.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/customers/card')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <IdCard size={16} /> Customer card
          </button>
          {can('voucher:view') && (
            <button className="btn-secondary" onClick={() => navigate('/customers/gift-vouchers')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={16} /> Gift vouchers
            </button>
          )}
          {can('customer:create') && (
            <button className="btn-primary" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Add customer
            </button>
          )}
        </div>
      </div>

      {/* Filters section */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by phone, name, code or email..." 
            className="input-field"
            style={{ paddingLeft: '44px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        {groups.length > 0 && (
          <Select className="input-field" value={group} onChange={e => setGroup(e.target.value)} aria-label="Group" style={{ flex: '0 1 220px' }}>
            <option value="">All groups</option>
            {groups.map(g => <option key={g.key} value={g.name}>{g.name} ({g.count})</option>)}
          </Select>
        )}

      </div>

      {picked.size > 0 && (
        <form onSubmit={(e) => { e.preventDefault(); if (target.trim()) addToGroup.mutate(); }}
          style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-hover)' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{picked.size} chosen</span>
          <input className="input-field" value={target} maxLength={40} placeholder="New or existing group"
            aria-label="Add to which group" onChange={e => setTarget(e.target.value)} style={{ width: '200px' }} />
          {/* Existing groups as chips, in place of the browser's own suggestion list: a new name can still be typed. */}
          {groups.filter(g => g.name.toLowerCase().includes(target.trim().toLowerCase()) && g.name !== target).slice(0, 6).map(g => (
            <button key={g.key} type="button" onClick={() => setTarget(g.name)} className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '999px' }}>{g.name}</button>
          ))}
          <button type="submit" className="btn-primary" disabled={!target.trim() || addToGroup.isPending}>Add to group</button>
          <button type="button" className="btn-secondary" onClick={() => setPicked(new Set())}>Clear</button>
        </form>
      )}

      {narrow ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customers...</div>
            : isError ? <LoadFailed what="customers" error={error} onRetry={refetch} />
            : customers?.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</div>
            : customers?.map(customer => (
              <button key={customer.id} type="button" onClick={() => navigate(`/customers/${customer.id}`)}
                style={{ textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, color: 'var(--text-primary)', display: 'grid', gap: 6, cursor: 'pointer', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{customer.name}</span>
                  {getStatusBadge(customer.status)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                  {customer.phone
                    ? formatPhone(customer.phone)
                    : <span style={{ color: 'var(--accent-warning, #f59e0b)' }}>No phone</span>}
                  {' · '}{customer.customerCode}
                </div>
                {(customer.email || customer.companyName) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                    {[customer.email, customer.companyName].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
        </div>
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
        {/* flexShrink 0: in this scrolling column, overflow hidden would otherwise let the card squash to the window and clip rows */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-hover)' }}>
                {canGroup && (
                  <th style={{ padding: '16px 0 16px 24px', width: '1%' }}>
                    <input type="checkbox" aria-label="Choose every customer shown"
                      checked={!!customers?.length && customers.every(c => picked.has(c.id))}
                      onChange={e => setPicked(e.target.checked ? new Set((customers ?? []).map(c => c.id)) : new Set())} />
                  </th>
                )}
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>CUSTOMER CODE</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>NAME</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>CONTACT</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>COMPANY / GST</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={canGroup ? 7 : 6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customers...</td></tr>
              ) : isError ? (<LoadFailed what="customers" error={error} onRetry={refetch} colSpan={canGroup ? 7 : 6} />) : customers?.length === 0 ? (
                <tr><td colSpan={canGroup ? 7 : 6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td></tr>
              ) : (
                customers?.map(customer => (
                  <tr
                    key={customer.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    {...rowLink(() => navigate(`/customers/${customer.id}`), { label: `Open ${customer.name}` })}
                  >
                    {canGroup && (
                      <td style={{ padding: '16px 0 16px 24px' }}>
                        <input type="checkbox" aria-label={`Choose ${customer.name}`} checked={picked.has(customer.id)} onChange={() => toggle(customer.id)} />
                      </td>
                    )}
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{customer.customerCode}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: '500' }}>{customer.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created {new Date(customer.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ whiteSpace: 'nowrap' }}>
                        {customer.phone
                          ? formatPhone(customer.phone)
                          : <span style={{ fontSize: '12px', color: 'var(--accent-warning, #f59e0b)' }}>No phone</span>}
                      </div>
                      <div style={{ fontSize: '12px' }}>{customer.email || '—'}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div>{customer.companyName || '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{customer.gstNumber || '—'}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {getStatusBadge(customer.status)}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <CustomerModal isOpen={adding} onClose={() => setAdding(false)} onSaved={(c) => c?.id && navigate(`/customers/${c.id}`)} />
    </div>
  );
}
