import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReelLinks, useReelOverview } from '../../hooks/useReelLinks';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import { RL_CSS, Thumb, copy } from './shared';

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * Reel links (PLAN-reel-links.md): the shop's list. The bio link sits on top -- it is the one link that really works
 * from a reel, because Instagram does not let a caption link be tapped.
 */
export default function ReelLinks() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const manage = can('reel_link:manage');
  const overview = useReelOverview();
  const list = useReelLinks();

  if (overview.isLoading || list.isLoading) return <PageLoader />;
  if (overview.isError || list.isError) {
    return (
      <div className="rl-page"><style>{RL_CSS}</style>
        <div className="rl-card rl-empty"><h2>Reel links could not be loaded</h2><p>{(overview.error || list.error)?.message || 'Check your connection and try again.'}</p>
          <button className="btn-secondary" onClick={() => { overview.refetch(); list.refetch(); }}>Try again</button></div>
      </div>
    );
  }

  const o = overview.data;
  const rows = list.data ?? [];

  return (
    <div className="rl-page">
      <style>{RL_CSS}</style>
      <header className="rl-head">
        <div>
          <h1>Reel links</h1>
          <p>The pieces from an Instagram reel, behind one link. Shoppers who open it see your logo and only those pieces, and buy them in your online shop.</p>
        </div>
        {manage && o.shopReady && <button className="btn-primary" onClick={() => navigate('/reel-links/new')}>New reel link</button>}
      </header>

      {!o.shopReady ? (
        <div className="rl-card">
          <b>Choose your online shop address first</b>
          <p className="rl-note" style={{ marginTop: 4 }}>Reel links open in your online shop, so it needs an address.</p>
          <Link className="btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }} to="/settings?section=ONLINE_SHOP">Open online shop settings</Link>
        </div>
      ) : (
        <>
          {!o.shopLive && (
            <div className="rl-strip"><div><b>Your online shop is closed</b><p>Shoppers who open a reel link see "not open" until you open the shop in Settings, Online shop.</p></div></div>
          )}
          {o.bioUrl && (
            <div className="rl-strip">
              <div><b>Link for your Instagram bio</b><p>Put this in your profile once. It lists all your reel links, newest first, so a caption can say "Link in bio, reel 12".</p></div>
              <div className="rl-row-actions"><span className="rl-url">{o.bioUrl.replace(/^https?:\/\//, '')}</span><button className="btn-secondary" onClick={() => copy(o.bioUrl, 'Bio link')}>Copy</button></div>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rl-card rl-empty">
              <h2>No reel links yet</h2>
              <p>Make one when you post your next reel: pick the pieces it shows and copy the link.</p>
              {manage && <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/reel-links/new')}>New reel link</button>}
            </div>
          ) : (
            <div className="rl-card" style={{ padding: '6px 14px' }}>
              <table className="rl-table">
                <thead><tr><th>Reel</th><th className="rl-hide-phone">Link</th><th className="num">Pieces</th><th className="num">Opened</th><th>Status</th><th aria-label="Copy" /></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const link = r.shortUrl || r.pageUrl;
                    return (
                      <tr key={r.id} onClick={() => navigate(`/reel-links/${r.id}`)}>
                        <td>
                          <div className="rl-cell">
                            <Thumb src={r.cover} />
                            <div style={{ minWidth: 0 }}>
                              <div className="rl-title">{r.title}</div>
                              <div className="rl-sub">Made {day(r.createdAt)}{r.createdBy ? ` by ${r.createdBy}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="rl-hide-phone"><span className="rl-url">{link ? link.replace(/^https?:\/\//, '') : 'No link yet'}</span></td>
                        <td className="num">{r.pieces}</td>
                        <td className="num">{r.opened.toLocaleString('en-IN')}</td>
                        <td><span className={r.active ? 'rl-on' : 'rl-off'}>{r.active ? 'On' : 'Off'}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {link && <button className="btn-secondary" onClick={() => copy(link)}>Copy link</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="rl-note" style={{ padding: '10px 4px' }}>"Opened" counts people only. Link-preview robots from Instagram and WhatsApp are left out.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
