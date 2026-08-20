import React, { useState } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { Plus, Search, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerModal from '../../components/sales/CustomerModal';

export default function Customers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers, isLoading } = useCustomers({
    search: searchTerm,
    status: statusFilter
  });

  const handleOpenModal = (customer = null) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your customer database and view order history.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Filters section */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, code, email, or phone..." 
            className="input-field" 
            style={{ paddingLeft: '44px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ position: 'relative', width: '200px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <select 
            className="input-field" 
            style={{ paddingLeft: '44px', width: '100%', appearance: 'none' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--surface-hover)' }}>
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
              ) : customers?.length === 0 ? (
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
                      <div>{customer.email || '—'}</div>
                      <div style={{ fontSize: '12px' }}>{customer.phone || '—'}</div>
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
                        style={{ padding: '6px 12px', fontSize: '13px', marginRight: '8px' }}
                      >
                        View
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleOpenModal(customer)}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customer={selectedCustomer} 
      />
    </div>
  );
}
