import React, { useState, useEffect } from 'react';
import LoadFailed from '../../components/LoadFailed';
import { useCustomers } from '../../hooks/useCustomers';
import { Search, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Select from '../../components/common/Select';
import CustomerModal from '../../components/sales/CustomerModal';
import { usePermission } from '../../hooks/usePermission';
import { formatPhone } from '../../utils/phone';


export default function Customers() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  // The search sent to the server waits for typing to pause: a phone number is ten keystrokes, and
  // each one used to be its own request.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: customers, isLoading, isError, error, refetch } = useCustomers({
    search,
    status: statusFilter
  });

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' },
      INACTIVE: { bg: 'rgba(107, 114, 128, 0.1)', color: 'rgb(107, 114, 128)' },
      ARCHIVED: { bg: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' },
    };
    const style = styles[status] || styles.INACTIVE;
    return (
      <span style={{
        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
        backgroundColor: style.bg, color: style.color, display: 'inline-block'
      }}>
        {status}
      </span>
    );
  };

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
          />
        </div>

        <div style={{ position: 'relative', flex: '0 1 200px', minWidth: '160px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <Select
            className="input-field"
            style={{ paddingLeft: '44px', width: '100%', appearance: 'none' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>

      {/* Main Table */}
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
                  <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
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

      <CustomerModal isOpen={adding} onClose={() => setAdding(false)} onSaved={(c) => c?.id && navigate(`/customers/${c.id}`)} />
    </div>
  );
}
