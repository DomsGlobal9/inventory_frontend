import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Loader2, RefreshCw, QrCode, KeyRound, X, AlertTriangle } from 'lucide-react';
import { useAdminWhatsApp, useLinkScaleezyWhatsApp, useReconnectScaleezyWhatsApp } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

/**
 * ScaleEzy's own WhatsApp number (sign-up codes, "your shop's WhatsApp is disconnected", etc.):
 * see it, reconnect it, or link it again -- without running a script against the service.
 * Below it, every shop's number, so a platform admin can see at a glance who has dropped.
 *
 * Inventory reaches the service with its own module key, granted only "may manage ScaleEzy's
 * number" -- never the service's admin key. Phones are masked by the service; nothing here shows
 * a message.
 */

const QR_REFRESH_MS = 18_000;      // a QR lives about 20 s
const LINK_GIVE_UP_MS = 4 * 60_000;

const STATUS = {
  CONNECTED:    { label: 'Connected',    color: 'var(--accent-success, #22c55e)', bg: 'rgba(34, 197, 94, 0.12)' },
  LINKING:      { label: 'Linking',      color: 'var(--accent-gold)',             bg: 'rgba(226, 193, 113, 0.12)' },
  DISCONNECTED: { label: 'Disconnected', color: 'var(--accent-danger)',           bg: 'rgba(239, 68, 68, 0.12)' },
  LOGGED_OUT:   { label: 'Logged out',   color: 'var(--accent-danger)',           bg: 'rgba(239, 68, 68, 0.12)' },
  NOT_LINKED:   { label: 'Not linked',   color: 'var(--text-muted)',              bg: 'var(--bg-hover)' }
};

const ago = (d) => {
  if (!d) return '—';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Pill({ status }) {
  const s = STATUS[status] ?? STATUS.NOT_LINKED;
  return <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function LinkPanel({ connected, onDone }) {
  const link = useLinkScaleezyWhatsApp();
  const [method, setMethod] = useState('qr');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [phoneProblem, setPhoneProblem] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const attempt = useRef(0);

  const start = (m = method) => {
    // Said in words, the server's own rule: a button that only switched itself off looked broken.
    if (m === 'code' && phone.replace(/\D/g, '').length < 10) { setPhoneProblem('Type ScaleEzy’s WhatsApp number, 10 digits, to get a pairing code.'); return; }
    const mine = ++attempt.current;
    if (!startedAt) setStartedAt(Date.now());
    link.mutate({ method: m, phone: m === 'code' ? phone : undefined }, {
      onSuccess: (r) => { if (mine === attempt.current) setResult(r); },
    });
  };
  const cancel = () => { attempt.current++; setResult(null); setStartedAt(null); onDone(); };

  useEffect(() => { if (connected && result) cancel(); }, [connected]); // linked: close the panel
  // A QR lives about 20 s: ask for a fresh one until linked, and give up after a few minutes.
  useEffect(() => {
    if (!result?.qr || connected) return undefined;
    if (startedAt && Date.now() - startedAt > LINK_GIVE_UP_MS) return undefined;
    const t = setTimeout(() => start('qr'), QR_REFRESH_MS);
    return () => clearTimeout(t);
  }, [result, connected]);

  const gaveUp = startedAt && Date.now() - startedAt > LINK_GIVE_UP_MS && !connected;
  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--border-light)', borderRadius: 12 }}>
      {!result && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={method === 'qr' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setMethod('qr'); setPhoneProblem(null); }}><QrCode size={15} /> QR code</button>
            <button className={method === 'code' ? 'btn-primary' : 'btn-secondary'} onClick={() => setMethod('code')}><KeyRound size={15} /> Pairing code</button>
          </div>
          {method === 'code' && (
            <div style={{ marginBottom: 12 }}>
              <label className="input-label" htmlFor="sc-phone">ScaleEzy's WhatsApp number</label>
              <input id="sc-phone" className="input-field" inputMode="tel" placeholder="e.g. 8142424642" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneProblem(null); }} />
              {phoneProblem && <p role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--accent-danger)' }}>{phoneProblem}</p>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" disabled={link.isPending} onClick={() => start()}>
              {link.isPending ? <Loader2 size={15} className="animate-spin" /> : null} {method === 'qr' ? 'Show QR code' : 'Get pairing code'}
            </button>
            <button className="btn-secondary" onClick={cancel}>Cancel</button>
          </div>
          {link.isPending && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Asking WhatsApp for a code. This can take up to half a minute.</p>}
        </>
      )}
      {result?.status === 'CONNECTED' && <p style={{ margin: 0 }}>It is already connected. Nothing to do.</p>}
      {result?.qr && !gaveUp && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={result.qr} alt="QR code to link ScaleEzy's WhatsApp" style={{ width: 220, height: 220, background: '#fff', padding: 8, borderRadius: 8 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6, flex: '1 1 260px' }}>
            <div>On ScaleEzy's phone, open <strong>WhatsApp → Settings → Linked devices → Link a device</strong>, and scan this.</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>A new code comes every 18 seconds. This page notices by itself when it is linked.</div>
            <button className="btn-secondary" style={{ marginTop: 8 }} onClick={cancel}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}
      {result?.pairingCode && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, letterSpacing: 4, fontWeight: 700 }}>{result.pairingCode}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>On ScaleEzy's phone: <strong>WhatsApp → Settings → Linked devices → Link a device → Link with phone number instead</strong>, and type this code.</div>
          <button className="btn-secondary" style={{ marginTop: 8 }} onClick={cancel}><X size={14} /> Cancel</button>
        </div>
      )}
      {gaveUp && (
        <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>
          Not linked after 4 minutes. <button className="btn-secondary" onClick={() => { setStartedAt(Date.now()); start('qr'); }}>Try again</button>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppPage() {
  const [linking, setLinking] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminWhatsApp({ poll: linking });
  const reconnect = useReconnectScaleezyWhatsApp();
  const sc = data?.scaleezy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}><MessageCircle size={24} /> WhatsApp</h1>
        <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /> Refresh</button>
      </div>

      {isLoading && <div className="card" style={{ padding: 24 }}><Loader2 className="animate-spin" /></div>}
      {(isError || data?.problem) && (
        <div className="card" style={{ padding: 16, display: 'flex', gap: 10, color: 'var(--accent-danger)' }}>
          <AlertTriangle size={18} /> <span>{data?.problem || error?.response?.data?.message || 'The WhatsApp service could not be reached just now.'}</span>
        </div>
      )}

      {data && !data.problem && (
        <>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>ScaleEzy's number</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Pill status={sc?.status ?? 'NOT_LINKED'} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sc?.phone || '—'}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              Linked {day(sc?.linkedAt)} · seen {ago(sc?.lastSeenAt)}{sc?.queued ? ` · ${sc.queued} waiting to send` : ''}
            </div>
            {!linking && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn-secondary" disabled={!sc || reconnect.isPending} onClick={() => reconnect.mutate()}
                  title="Wakes the connection up again. Keeps the link: nothing to scan.">
                  {reconnect.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Reconnect
                </button>
                <button className="btn-primary" onClick={() => setLinking(true)}><QrCode size={15} /> Link again</button>
              </div>
            )}
            {linking && <LinkPanel connected={sc?.status === 'CONNECTED'} onDone={() => setLinking(false)} />}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Shop numbers</h2>
            {data.shops.length === 0 ? <p style={{ color: 'var(--text-muted)', margin: 0 }}>No shop has linked a number yet.</p> : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 12 }}>
                    <th style={{ padding: 8 }}>Shop</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}>Number</th><th style={{ padding: 8 }}>Last seen</th><th style={{ padding: 8 }}>Waiting</th>
                  </tr></thead>
                  <tbody>
                    {data.shops.map(s => (
                      <tr key={s.clientId} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 8 }}><div style={{ fontWeight: 500 }}>{s.businessName || s.clientId}</div>{s.businessName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.clientId}</div>}</td>
                        <td style={{ padding: 8 }}><Pill status={s.status} /></td>
                        <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{s.phone || '—'}</td>
                        <td style={{ padding: 8 }}>{ago(s.lastSeenAt)}</td>
                        <td style={{ padding: 8 }}>{s.queued || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <PageGuide title="About WhatsApp">
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>ScaleEzy's number</strong> sends the platform's own messages: sign-up codes, and "your shop's WhatsApp is disconnected".</li>
          <li><strong>Reconnect</strong> wakes a dropped connection up again. It keeps the link, so nobody has to scan anything. Try it first.</li>
          <li><strong>Link again</strong> is for when the phone was logged out or replaced: scan the QR, or type the pairing code, on ScaleEzy's phone.</li>
          <li><strong>Shop numbers</strong> are linked by each shop in Inventory → Settings → WhatsApp. This list only shows them; the shop relinks its own.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
