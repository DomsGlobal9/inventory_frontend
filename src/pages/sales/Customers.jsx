import React, { useState, useEffect } from 'react';
import LoadFailed from '../../components/LoadFailed';
import { useCustomers } from '../../hooks/useCustomers';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerModal from '../../components/sales/CustomerModal';
import { usePermission } from '../../hooks/usePermission';
import { formatPhone } from '../../utils/phone';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CUSTOMER_STATUS, StatusPill } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';


export default function Customers() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  // The search sent to the server waits for typing to pause: a phone number is ten keystrokes, and
  // each one used to be its own request.
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
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
  const { data: customers, isLoading, isError, error, refetch } = useCustomers({ search });
  const getStatusBadge = (status) => <StatusPill map={CUSTOMER_STATUS} value={status} />;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your customer database and view order history.</p>
        </div>
        {can('customer:create') && (
          <button className="btn-primary" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add customer
          </button>
        )}
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
        </div>
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading customers...</td></tr>
              ) : isError ? (<LoadFailed what="customers" error={error} onRetry={refetch} colSpan={6} />) : customers?.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td></tr>
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
