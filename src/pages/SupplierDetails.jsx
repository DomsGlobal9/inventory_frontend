import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { firstMissingField, missingFieldMessage } from '../lib/formGuard';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  FileText,
  IndianRupee,
  Clock,
  Package,
  X,
  Copy,
  Check,
  TrendingUp,
  Plus,
  ChevronRight
} from 'lucide-react';
import { typedPhone } from '../utils/phone';
import { useQuery } from '@tanstack/react-query';
import { useUpdateSupplier } from '../hooks/useSuppliers';
import SupplierProductsPanel from '../components/SupplierProductsPanel';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';
import { rowLink } from '../components/common/rowLink';
import { usePermission } from '../hooks/usePermission';

export default function SupplierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const updateSupplier = useUpdateSupplier();

  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', isActive: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${id}`);
      return res;
    }
  });

  const supplier = data?.data;

  // Sync edit form when supplier data loads
  useEffect(() => {
    if (supplier && !showEditModal) {
      setEditForm({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        isActive: supplier.isActive !== false
      });
    }
  }, [supplier, showEditModal]);

  // The clipboard exists only on secure pages and only when the browser allows it; without it the
  // old version threw and the button simply did nothing.
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(`Could not copy. Select the ${fieldName.toLowerCase()} and copy it by hand.`);
    }
  };

  if (isLoading) return <PageLoader text="Loading Supplier Details..." />;
  if (error || !supplier) return <div style={{ padding: '32px', color: 'var(--accent-danger)' }}>Failed to load supplier.</div>;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const missing = firstMissingField(e.currentTarget);
    if (missing) { toast.error(missingFieldMessage(missing)); return; }
    try {
      await updateSupplier.mutateAsync({ id, data: editForm });
    } catch {
      return;
    }
    setShowEditModal(false);
  };

  const metrics = supplier.metrics || { openOrders: 0, totalSpend: 0, totalOrders: 0, lastOrderDate: null };
  const purchaseOrders = supplier.purchaseOrders || [];

  // Generate monogram initials
  const initials = (supplier.name || 'S')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="page-scroll mobile-no-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100%',
        paddingBottom: '48px'
      }}
    >
      {/* Breadcrumb Navigation */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <button
          onClick={() => navigate('/inventory/suppliers')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 500
          }}
          className="hover-underline"
        >
          Suppliers
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{supplier.name}</span>
      </motion.div>

      {/* Header Bar */}
      <motion.div
        variants={item}
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
          <button
            className="btn-icon"
            onClick={() => navigate('/inventory/suppliers')}
            title="Back to suppliers list"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-light)',
              width: '40px',
              height: '40px'
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Supplier Monogram Badge */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(166, 217, 43, 0.2))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '17px',
              color: 'var(--accent-success)',
              letterSpacing: '0.04em',
              flexShrink: 0
            }}
          >
            {initials}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {supplier.name}
              </h1>

              {/* Status Pill with subtle glow */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  backgroundColor: supplier.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: supplier.isActive ? 'var(--accent-success)' : 'var(--accent-danger)',
                  border: `1px solid ${supplier.isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'currentColor'
                  }}
                />
                {supplier.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            {/* Supplier Code Chip with Copy Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                onClick={() => copyToClipboard(supplier.supplierCode, 'Supplier code')}
                title="Click to copy supplier code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'var(--bg-input)',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building size={12} style={{ color: 'var(--text-muted)' }} />
                {supplier.supplierCode || 'SUP-AUTO'}
                {copiedField === 'Supplier code' ? <Check size={11} color="var(--accent-success)" /> : <Copy size={11} style={{ opacity: 0.6 }} />}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {can('purchase_order:create') && (
            <button
              className="btn-primary"
              disabled={supplier.isActive === false}
              title={supplier.isActive === false ? 'Reactivate supplier to create purchase orders' : 'Raise a new purchase order for this supplier'}
              onClick={() => navigate('/inventory/purchase-orders/new', { state: { supplierId: supplier.id } })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
            >
              <Plus size={15} /> New Purchase Order
            </button>
          )}

          {can('supplier:update') && (
            <button
              className="btn-secondary"
              onClick={() => setShowEditModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
            >
              <Edit size={15} /> Edit Supplier
            </button>
          )}
        </div>
      </motion.div>

      {/* Top Grid: Contact Details & Procurement Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '24px' }}>
        {/* Contact Info Card */}
        <motion.div variants={item} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: 'var(--accent-primary)' }} /> Contact Details
            </h3>
            {can('supplier:update') && (
              <button
                onClick={() => setShowEditModal(true)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
              >
                Update
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <Mail size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</div>
                {supplier.email ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <a
                      href={`mailto:${supplier.email}`}
                      style={{ color: 'var(--text-primary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}
                      className="hover-underline"
                    >
                      {supplier.email}
                    </a>
                    <button
                      onClick={() => copyToClipboard(supplier.email, 'Email')}
                      title="Copy email"
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {copiedField === 'Email' ? <Check size={13} color="var(--accent-success)" /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>No email provided</div>
                )}
              </div>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <Phone size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Phone Number</div>
                {supplier.phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <a
                      href={`tel:${supplier.phone}`}
                      style={{ color: 'var(--text-primary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}
                      className="hover-underline"
                    >
                      {supplier.phone}
                    </a>
                    <button
                      onClick={() => copyToClipboard(supplier.phone, 'Phone number')}
                      title="Copy phone"
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {copiedField === 'Phone number' ? <Check size={13} color="var(--accent-success)" /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>No phone provided</div>
                )}
              </div>
            </div>

            {/* Physical Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Physical Address</div>
                <div style={{ color: supplier.address ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', marginTop: '2px' }}>
                  {supplier.address || 'No address specified'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Procurement KPI Overview Card */}
        <motion.div variants={item} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-gold)' }} /> Procurement Overview
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
              Lifetime
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', flex: 1 }}>
            {/* Total Orders */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <FileText size={14} style={{ color: 'var(--text-muted)' }} /> Total Orders
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {metrics.totalOrders || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                POs placed to date
              </div>
            </div>

            {/* Open Orders */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Package size={14} style={{ color: metrics.openOrders > 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }} /> Open Orders
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: metrics.openOrders > 0 ? 'var(--accent-gold)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {metrics.openOrders || 0}
              </div>
              <div style={{ fontSize: '11px', color: metrics.openOrders > 0 ? 'var(--accent-gold)' : 'var(--accent-success)', marginTop: '4px', fontWeight: 500 }}>
                {metrics.openOrders > 0 ? 'Active in pipeline' : 'All fulfilled'}
              </div>
            </div>

            {/* Total Spend */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <IndianRupee size={14} style={{ color: 'var(--text-muted)' }} /> Total Spend
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ₹{Number(metrics.totalSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Procurement volume
              </div>
            </div>

            {/* Last Order Date */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> Last Order Date
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {metrics.lastOrderDate ? new Date(metrics.lastOrderDate).toLocaleDateString() : 'Never'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {metrics.lastOrderDate ? 'Most recent PO' : 'No previous orders'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Items We Buy Here Section */}
      <motion.div variants={item}>
        <SupplierProductsPanel
          supplierId={supplier.id}
          supplierName={supplier.name}
          supplierIsActive={supplier.isActive !== false}
        />
      </motion.div>

      {/* Recent Purchase Orders Section */}
      <motion.div variants={item} className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Purchase Orders</h3>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
                {purchaseOrders.length}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Order history and delivery status for this supplier.
            </p>
          </div>

          {can('purchase_order:create') && (
            <button
              className="btn-primary"
              disabled={supplier.isActive === false}
              onClick={() => navigate('/inventory/purchase-orders/new', { state: { supplierId: supplier.id } })}
              style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> New PO
            </button>
          )}
        </div>

        <div className="table-container mobile-no-scroll" style={{ overflowX: 'auto', border: 'none', borderRadius: 0, background: 'transparent' }}>
          {purchaseOrders.length === 0 ? (
            <div style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No purchase orders recorded for this supplier yet.</p>
              {can('purchase_order:create') && (
                <button
                  className="btn-secondary"
                  disabled={supplier.isActive === false}
                  onClick={() => navigate('/inventory/purchase-orders/new', { state: { supplierId: supplier.id } })}
                  style={{ marginTop: '12px', fontSize: '13px' }}
                >
                  Raise First Purchase Order
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border-light)' }}>
                <tr>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PO Number</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Created</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr
                    key={po.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.15s ease' }}
                   
                    {...rowLink(() => navigate(`/inventory/purchase-orders/${po.id}`), { label: `Open ${po.poNumber || 'purchase order'}` })}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        {po.poNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: po.status === 'RECEIVED' ? 'rgba(16, 185, 129, 0.1)' :
                                       (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') ? 'rgba(245, 158, 11, 0.12)' :
                                       po.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: po.status === 'RECEIVED' ? 'var(--accent-success)' :
                               (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') ? 'var(--accent-gold)' :
                               po.status === 'CANCELLED' ? 'var(--accent-danger)' : 'var(--text-secondary)',
                        border: `1px solid ${
                          po.status === 'RECEIVED' ? 'rgba(16, 185, 129, 0.25)' :
                          (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') ? 'rgba(245, 158, 11, 0.25)' :
                          po.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(156, 163, 175, 0.2)'
                        }`
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                        {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        ₹{Number(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>View</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Edit Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '14px',
                  padding: '32px',
                  width: '100%',
                  maxWidth: '520px',
                  border: '1px solid var(--border-light)',
                  position: 'relative',
                  boxShadow: 'var(--shadow-modal)'
                }}
              >
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-icon"
                  style={{ position: 'absolute', top: '20px', right: '20px' }}
                >
                  <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <Edit size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Edit Supplier</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Update contact information and active status.</p>
                  </div>
                </div>

                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
                  <div>
                    <label className="input-label">Company Name *</label>
                    <input
                      required
                      type="text"
                      className="input-field"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="supplier@company.com"
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone Number</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="e.g. +91 9876543210"
                      value={editForm.phone}
                      maxLength={20}
                      onChange={e => setEditForm({...editForm, phone: typedPhone(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="input-label">Physical Address</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      placeholder="Street, City, State, PIN..."
                      style={{ resize: 'none' }}
                      value={editForm.address}
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                    ></textarea>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editForm.isActive}
                      onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="isActive" style={{ color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                      Active Supplier (available for purchase orders)
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateSupplier.isPending}
                      className="btn-primary"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      {updateSupplier.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
