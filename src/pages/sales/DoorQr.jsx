import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLocationContext } from '../../contexts/LocationContext';
import LoadFailed from '../../components/LoadFailed';

/**
 * The door standee: one A5-ish sheet with a QR that opens WhatsApp with "I'm at the shop" and this
 * store's door code already written. Print it, stand it at the door. Uses the same print rules as
 * the shelf labels (index.css: only .tagsheet-paper prints).
 */
export default function DoorQr() {
  const navigate = useNavigate();
  const { currentLocation } = useLocationContext();
  const q = useQuery({
    queryKey: ['door-qr', currentLocation?.id],
    queryFn: async () => (await api.get('/customers/door-qr', { params: { locationId: currentLocation?.id } })).data,
    enabled: !!currentLocation?.id
  });
  const d = q.data;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '24px', paddingBottom: '64px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div className="tagsheet-chrome">
        <button type="button" onClick={() => navigate('/customers/card')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Customer card
        </button>
        <h1 style={{ fontSize: '28px', margin: '0 0 6px', color: 'var(--text-primary)' }}>Door QR</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Print this and stand it at the door of {currentLocation?.name ?? 'this store'}. A customer scans it, presses send in WhatsApp,
          and appears under "In the store now" on the Customer card.
        </p>
      </div>

      {q.isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>}
      {q.isError && <LoadFailed what="the door QR" error={q.error} onRetry={q.refetch} />}

      {d && !d.link && (
        <div role="alert" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '16px' }}>
          <p style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>{d.reason}</p>
          <Link to="/settings?section=WHATSAPP" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Open WhatsApp settings</Link>
        </div>
      )}

      {d?.link && (
        <>
          <div className="tagsheet-chrome" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button type="button" className="btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print
            </button>
          </div>
          <div className="tagsheet-paper">
            {/* Its own box: .tagsheet-paper carries the shelf-label sheet's print layout. */}
            <div style={{ display: 'block', width: '460px', maxWidth: '100%', boxSizing: 'border-box', background: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: '16px', padding: '36px 28px', textAlign: 'center', margin: '0 auto' }}>
            <div style={{ fontSize: '30px', fontWeight: 800 }}>{d.shop}</div>
            <div style={{ fontSize: '15px', color: '#555', marginBottom: '22px' }}>{d.store}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '18px' }}>Scan for your sizes and today's picks</div>
            <QRCodeSVG value={d.link} size={260} level="M" includeMargin aria-label="QR code that opens WhatsApp" />
            <div style={{ fontSize: '14px', color: '#333', marginTop: '16px' }}>Opens WhatsApp with a message ready. Just press send.</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '14px' }}>
              No camera? Send <b>{d.code}</b> on WhatsApp to <b>+{d.number}</b>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
