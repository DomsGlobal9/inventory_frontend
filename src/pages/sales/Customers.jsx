import React, { useState, useEffect } from 'react';
import LoadFailed from '../../components/LoadFailed';
import { useCustomers } from '../../hooks/useCustomers';
import { Search, Plus, Gift, Upload } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerModal from '../../components/sales/CustomerModal';
import CustomerImportModal from '../../components/customers/CustomerImportModal';
import { usePermission } from '../../hooks/usePermission';
import { formatPhone } from '../../utils/phone';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CUSTOMER_STATUS, StatusPill } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import CustomerFilters, { ActiveCustomerFilters } from '../../components/sales/CustomerFilters';

const PAGE = 10;
const FILTER_KEYS = ['group', 'bought', 'source', 'phone', 'offers', 'added', 'sort'];

export default function Customers() {
  const navigate = useNavigate();
  const { can } = usePermission();
  // ?new=1 (the Dashboard's + Customer) opens the form at once; the address is then tidied, so a refresh
  // does not open it again.
  const [linkParams, setLinkParams] = useSearchParams();
  // Search, filters, sort and page live in the page address, as on Products and Orders: Back from a
  // customer returns to the same page of the same list.
  const filters = Object.fromEntries(FILTER_KEYS.map(k => [k, linkParams.get(k) ?? '']));
  const page = Math.max(1, Number(linkParams.get('page')) || 1);
  /** Change some of them. Anything but the page itself starts again from page 1. */
  const setAddress = (changes) => setLinkParams(p => {
    for (const [k, v] of Object.entries(changes)) { if (v === '' || v === null || v === undefined) p.delete(k); else p.set(k, String(v)); }
    if (!('page' in changes)) p.delete('page');
    return p;
  }, { replace: true });
  const setPage = (n) => setAddress({ page: n > 1 ? n : '' });
  const [searchTerm, setSearchTerm] = useState(() => linkParams.get('q') ?? '');
  // The search sent to the server waits for typing to pause: a phone number is ten keystrokes, and
  // each one used to be its own request.
  const search = linkParams.get('q') ?? '';
  const [adding, setAdding] = useState(() => linkParams.get('new') === '1');
  // ?import=1 opens Import customers: CRM's own "Import customers" button links here (one import for both, 17 Nov 2026).
  const [importing, setImporting] = useState(() => linkParams.get('import') === '1');
  React.useEffect(() => {
    if (linkParams.get('new') || linkParams.get('import')) setLinkParams(p => { p.delete('new'); p.delete('import'); return p; }, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A card per customer on a phone. The table was 774px wide, so STATUS and the View button --
  // the only way into a customer -- sat off the right edge of a 390px screen.
  const narrow = useMediaQuery('(max-width: 760px)');

  useEffect(() => {
    const t = setTimeout(() => { if (searchTerm.trim() !== search) setAddress({ q: searchTerm.trim() }); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * No status filter. It offered Active, Inactive and Archived, but nothing in ScaleEzy can make a
   * customer inactive or archived -- the form has no such control and there is no archive action --
   * so two of its three choices always answered "No customers found", and the third was the same
   * list as no filter at all. A filter with nothing to filter was only a way to hide customers.
   */
  const group = filters.group;
  // Ten at a time: a shop can hold thousands of customers, and search reaches all of them.
  const { data, isLoading, isError, isFetching, error, refetch } = useCustomers({ search, ...filters, page, limit: PAGE });
  const customers = data?.customers;
  const meta = data?.meta;
  // Somebody deleted while on the last page: that page no longer exists, so go to the one that does.
  useEffect(() => { if (meta && page > meta.totalPages) setPage(meta.totalPages); }, [meta, page]); // eslint-disable-line react-hooks/exhaustive-deps
  // What is being typed in the page box; null shows the page we are on.
  const [typedPage, setTypedPage] = useState(null);
  const goTo = () => {
    if (typedPage === null) return;
    const n = Number(typedPage);
    if (typedPage !== '' && n >= 1 && meta) setPage(Math.min(n, meta.totalPages));
    setTypedPage(null);
  };
  const pager = meta && meta.total > 0 && (
    <nav aria-label="Customer pages" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 16px' }}>
      <span aria-live="polite" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total.toLocaleString('en-IN')} customers
      </span>
      {meta.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" className="btn-secondary" disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}>Previous</button>
          {/* Type a page and press Enter, or click away: straight there, kept within the pages there are. */}
          <form onSubmit={(e) => { e.preventDefault(); goTo(); e.currentTarget.querySelector('input')?.blur(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <label htmlFor="customer-page">Page</label>
            <input id="customer-page" className="input-field" inputMode="numeric" autoComplete="off" aria-label={`Go to page, 1 to ${meta.totalPages}`}
              value={typedPage ?? String(meta.page)} onChange={e => setTypedPage(e.target.value.replace(/\D/g, '').slice(0, 7))} onBlur={goTo} onFocus={e => e.target.select()}
              style={{ width: '64px', minWidth: 0, textAlign: 'center', padding: '6px 4px', fontSize: '16px' }} />
            <span>of {meta.totalPages.toLocaleString('en-IN')}</span>
          </form>
          <button type="button" className="btn-secondary" disabled={page >= meta.totalPages || isFetching} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </nav>
  );

  // Groups: filter the list by one. Putting customers in a group is ScaleEzy CRM's (18 Nov 2026).
  const { data: groups = [] } = useQuery({ queryKey: ['customer-groups'], queryFn: async () => (await api.get('/customer-groups')).data || [] });
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
          {can('voucher:view') && (
            <button className="btn-secondary" onClick={() => navigate('/customers/gift-vouchers')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={16} /> Gift vouchers
            </button>
          )}
          {can('customer:create') && (
            <button className="btn-secondary" onClick={() => setImporting(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} /> Import customers
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by phone, name, code, email or bill number..."
            className="input-field"
            style={{ paddingLeft: '44px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        <CustomerFilters value={filters} groups={groups} onChange={setAddress} />
        <ActiveCustomerFilters value={filters} onChange={setAddress}
          onClearAll={() => setAddress(Object.fromEntries(FILTER_KEYS.filter(k => k !== 'sort').map(k => [k, ''])))} />
      </div>

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
          {pager}
        </div>
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
        {/* flexShrink 0: in this scrolling column, overflow hidden would otherwise let the card squash to the window and clip rows */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-hover)' }}>
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
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customers...</td></tr>
              ) : isError ? (<LoadFailed what="customers" error={error} onRetry={refetch} colSpan={6} />) : customers?.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td></tr>
              ) : (
                customers?.map(customer => (
                  <tr
                    key={customer.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    {...rowLink(() => navigate(`/customers/${customer.id}`), { label: `Open ${customer.name}` })}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{customer.customerCode}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: '500' }}>{customer.name}</div>
                      {/* The day of a load is not the day they became a customer. */}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{customer.importSource ? "From the shop's earlier records" : `Created ${new Date(customer.createdAt).toLocaleDateString()}`}</div>
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
        {pager}
      </div>
      )}

      {can('customer:create') && <CustomerImportModal open={importing} onClose={() => setImporting(false)} />}
      <CustomerModal isOpen={adding} onClose={() => setAdding(false)} onSaved={(c) => c?.id && navigate(`/customers/${c.id}`)} />
    </div>
  );
}
