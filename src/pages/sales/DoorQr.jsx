import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Loader2, ScanLine, Send, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useLocationContext } from '../../contexts/LocationContext';
import LoadFailed from '../../components/LoadFailed';

/**
 * The door standee: a card with a QR that opens WhatsApp with "I'm at the shop" and this store's
 * door code already written. Print it, stand it at the door. Uses the same print rules as the shelf
 * labels (index.css: only .tagsheet-paper prints). Two columns so the whole thing fits one laptop
 * screen without the page's own scrollbar showing.
 */

// The standee is the shop's printed sign, so its colours are fixed rather than following the theme.
const DEEP = '#164B1E', LIME = '#A6D92B';
const pretty = (digits) => digits?.length === 12 && digits.startsWith('91') ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;
const corner = (pos) => ({ position: 'absolute', width: '26px', height: '26px', borderColor: LIME, borderStyle: 'solid', borderWidth: 0, ...pos });

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
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingTop: '16px', paddingBottom: '32px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'start' }}>
        <div className="tagsheet-chrome">
          <button type="button" onClick={() => navigate('/customers/card')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <ArrowLeft size={16} /> Customer card
          </button>
          <h1 style={{ fontSize: '28px', margin: '0 0 6px', color: 'var(--text-primary)' }}>Door QR</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            Print it and stand it at the door of {currentLocation?.name ?? 'this store'}.
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: '14px' }}>
            {[
              [ScanLine, 'The customer scans it', 'WhatsApp opens with a message already written.'],
              [Send, 'They press send', 'Nothing to type, no app to install.'],
              [Sparkles, 'You see them in seconds', 'They appear under "In the store now" on the Customer card, with their sizes and picks.']
            ].map(([Icon, title, text]) => (
              <li key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 36px', height: '36px', borderRadius: '10px', background: 'var(--brand-deep)', color: 'var(--brand)', display: 'grid', placeItems: 'center' }}><Icon size={18} /></span>
                <span>
                  <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{text}</span>
                </span>
              </li>
            ))}
          </ol>
          {d?.link && (
            <>
              <button type="button" className="btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={16} /> Print
              </button>
            </>
          )}
        </div>

        <div>
          {q.isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>}
          {q.isError && <LoadFailed what="the door QR" error={q.error} onRetry={q.refetch} />}

          {d && !d.link && (
            <div role="alert" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>{d.reason}</p>
              <Link to={`/settings?section=${d.fix === 'GENERAL' ? 'GENERAL' : 'WHATSAPP'}`} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                {d.fix === 'GENERAL' ? 'Open shop details' : 'Open WhatsApp settings'}
              </Link>
            </div>
          )}

          {d?.link && (
            <div className="tagsheet-paper" style={{ justifyContent: 'center' }}>
              {/* Its own box: .tagsheet-paper carries the shelf-label sheet's print layout. */}
              <div style={{ display: 'block', width: '340px', maxWidth: '100%', boxSizing: 'border-box', background: '#fff', color: '#111', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', border: '1px solid #e5e5e5', textAlign: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div style={{ background: DEEP, color: '#fff', padding: '20px 20px 18px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1.1 }}>{d.shop}</div>
                  <div style={{ fontSize: '13px', color: LIME, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>{d.store}</div>
                </div>
                <div style={{ padding: '18px 22px 16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.25 }}>Your sizes and today's picks</div>
                  <div style={{ fontSize: '13px', color: '#555', margin: '2px 0 14px' }}>ready before you reach the first rack</div>
                  <div style={{ position: 'relative', display: 'inline-block', padding: '18px' }}>{/* 18px of white is the quiet zone a scanner needs round the code */}
                    <span style={corner({ top: 0, left: 0, borderTopWidth: '4px', borderLeftWidth: '4px', borderTopLeftRadius: '8px' })} />
                    <span style={corner({ top: 0, right: 0, borderTopWidth: '4px', borderRightWidth: '4px', borderTopRightRadius: '8px' })} />
                    <span style={corner({ bottom: 0, left: 0, borderBottomWidth: '4px', borderLeftWidth: '4px', borderBottomLeftRadius: '8px' })} />
                    <span style={corner({ bottom: 0, right: 0, borderBottomWidth: '4px', borderRightWidth: '4px', borderBottomRightRadius: '8px' })} />
                    <QRCodeSVG value={d.link} size={196} level="M" fgColor={DEEP} aria-label="QR code that opens WhatsApp" style={{ display: 'block' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '14px 0 0', fontSize: '12px', fontWeight: 600 }}>
                    {['Scan', 'Press send', "We'll find your fit"].map((s, i) => (
                      <React.Fragment key={s}>
                        {i > 0 && <span style={{ color: '#bbb' }}>→</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: LIME, color: DEEP, display: 'inline-grid', placeItems: 'center', fontSize: '11px' }}>{i + 1}</span>{s}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed #ddd', padding: '10px 16px 14px', fontSize: '12px', color: '#555' }}>
                  No camera? WhatsApp <b style={{ color: DEEP }}>{d.code}</b> to <b style={{ color: DEEP, whiteSpace: 'nowrap' }}>{pretty(d.number)}</b>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
