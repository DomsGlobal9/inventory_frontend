import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useReelLinks, useReelOverview, useSwitchReelLink } from '../../hooks/useReelLinks';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import { RL_CSS, ReelSwitch, QrDialog, ReelVideoDialog, instagramPlayer, copy, reelParts } from './shared';

/**
 * Reel links (PLAN-reel-links.md; redesign 16 Nov, option A): a wall of reel cards across the whole page, each one a
 * collage of the pieces it shows. The bio link sits on top -- it is the one link that really works from a reel,
 * because Instagram does not let a caption link be tapped.
 */
export default function ReelLinks() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const manage = can('reel_link:manage');
  const overview = useReelOverview();
  const list = useReelLinks();
  const [q, setQ] = useState('');
  const [qr, setQr] = useState(null);
  const [playing, setPlaying] = useState(null);

  const rows = list.data ?? [];
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter(r => r.title.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const numbers = useMemo(() => {
    const live = rows.filter(r => r.active);
    const best = [...rows].sort((a, b) => (b.openedWeek ?? 0) - (a.openedWeek ?? 0))[0];
    return {
      week: rows.reduce((t, r) => t + (r.openedWeek ?? 0), 0),
      live: live.length,
      soldOut: live.reduce((t, r) => t + (r.soldOut ?? 0), 0),
      best: best && best.openedWeek > 0 ? best : null
    };
  }, [rows]);

  if (overview.isLoading || list.isLoading) return <PageLoader />;
  if (overview.isError || list.isError) {
    return (
      <div className="rl-page"><style>{RL_CSS}</style>
        <div className="rl-card"><h2 style={{ marginTop: 0 }}>Reel links could not be loaded</h2><p className="rl-note">{(overview.error || list.error)?.message || 'Check your connection and try again.'}</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => { overview.refetch(); list.refetch(); }}>Try again</button></div>
      </div>
    );
  }

  const o = overview.data;

  return (
    <div className="rl-page">
      <style>{RL_CSS}</style>
      <header className="rl-head">
        <div>
          <h1>Reel links</h1>
          <p>Each reel gets one link with only the pieces it shows. Shoppers open it, see your logo and those pieces, and buy them in your online shop.</p>
        </div>
        <div className="rl-row-actions">
          {rows.length > 4 && <input className="input-field" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reels" aria-label="Search reels" />}
          {manage && o.shopReady && <button className="btn-primary" onClick={() => navigate('/reel-links/new')}>New reel link</button>}
        </div>
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
            <div className="rl-strip"><div><b>Your online shop is closed</b><p>Shoppers who open a reel link see "not open" until you open the shop in Settings, Online shop.</p></div>
              <Link className="btn-secondary" to="/settings?section=ONLINE_SHOP">Open online shop settings</Link></div>
          )}
          {o.bioUrl && (
            <div className="rl-bio">
              <div><b>Your Instagram bio link</b><p>Put it in your profile once. It always lists every reel, newest first, so a caption can say "Link in bio, reel 12".</p></div>
              <div className="rl-row-actions"><span className="rl-url">{o.bioUrl.replace(/^https?:\/\//, '')}</span>
                <button type="button" className="rl-lime" onClick={() => copy(o.bioUrl, 'Bio link')}>Copy bio link</button></div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rl-stats">
              <div className="rl-card rl-stat"><div className="k">Opened in the last 7 days</div><div className="v">{numbers.week.toLocaleString('en-IN')}</div></div>
              <div className="rl-card rl-stat"><div className="k">Reels live</div><div className="v">{numbers.live} <small>of {rows.length}</small></div></div>
              <div className="rl-card rl-stat"><div className="k">Pieces sold out in live reels</div><div className="v" style={numbers.soldOut ? { color: 'var(--accent-warning)' } : undefined}>{numbers.soldOut}</div></div>
              <div className="rl-card rl-stat"><div className="k">Opened most in the last 7 days</div>
                {numbers.best ? <><div className="rl-title" style={{ marginTop: 4 }}>{numbers.best.title}</div><div className="rl-sub">{numbers.best.openedWeek.toLocaleString('en-IN')} {numbers.best.openedWeek === 1 ? 'person' : 'people'}</div></>
                  : <div className="rl-sub" style={{ marginTop: 6 }}>No opens yet this week</div>}
              </div>
            </div>
          )}

          <div className="rl-wall">
            {manage && !q && (
              <div className="rl-newreel" role="button" tabIndex={0} onClick={() => navigate('/reel-links/new')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/reel-links/new'); } }}>
                <span className="plus" aria-hidden="true">+</span>
                <span>New reel link</span>
                <small>{rows.length ? 'Pick the pieces your next reel shows' : 'Make one when you post your next reel'}</small>
              </div>
            )}
            {shown.map(r => <ReelCard key={r.id} r={r} manage={manage} onOpen={() => navigate(`/reel-links/${r.id}`)} onQr={setQr} onPlay={setPlaying} />)}
          </div>
          {rows.length > 0 && shown.length === 0 && <p className="rl-note">No reel has "{q}" in its title.</p>}
          {rows.length > 0 && <p className="rl-note">Opens count people only. Link-preview robots from Instagram and WhatsApp are left out.</p>}
        </>
      )}
      <QrDialog url={qr?.url} name={qr?.code} title={qr?.title} onClose={() => setQr(null)} />
      {playing && <ReelVideoDialog reelUrl={playing.reelUrl} title={playing.title} onClose={() => setPlaying(null)} />}
    </div>
  );
}

/** One reel: its pieces as a collage, its title, how it is doing, on / off, and the link to copy. */
function ReelCard({ r, manage, onOpen, onQr, onPlay }) {
  const switcher = useSwitchReelLink(r.id);
  const link = r.shortUrl || r.pageUrl;
  const { number, rest } = reelParts(r.title);
  const covers = r.covers?.length ? r.covers : (r.cover ? [r.cover] : []);
  const flip = async (on) => {
    try { await switcher.mutateAsync(on); toast.success(on ? `${rest} is live` : `${rest} is switched off`); }
    catch (e) { toast.error(e?.message || 'That did not work. Try again.'); }
  };
  const meta = !r.active ? 'Switched off'
    : r.soldOut ? `${r.soldOut} sold out`
    : `${r.opened.toLocaleString('en-IN')} ${r.opened === 1 ? 'open' : 'opens'} · ${r.pieces} ${r.pieces === 1 ? 'piece' : 'pieces'}`;
  return (
    <article className={`rl-reel${r.active ? '' : ' off'}`} tabIndex={0} aria-label={`${r.title}, ${meta}`}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}>
      <div className={`rl-cover${covers.length <= 1 ? ' one' : covers.length === 2 ? ' two' : ''}`}>
        {covers.length ? covers.map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)
          : <span className="rl-cover-empty">{r.pieces ? 'No photos yet' : 'No pieces yet'}</span>}
        {number && <span className="rl-tag">Reel {number}</span>}
        {/* The reel itself, playing here (17 Nov): only for an Instagram reel address. */}
        {instagramPlayer(r.reelUrl) && (
          <button type="button" className="rl-play" aria-label={`Play ${r.title}`} onClick={(e) => { e.stopPropagation(); onPlay(r); }}>
            <i aria-hidden="true" />Play reel
          </button>
        )}
      </div>
      <div className="rl-reel-body">
        <div className="rl-reel-title" title={r.title}>{rest}</div>
        <div className="rl-reel-meta">
          <span style={r.active && r.soldOut ? { color: 'var(--accent-warning)' } : undefined}>{meta}</span>
          {manage && <ReelSwitch on={r.active} disabled={switcher.isPending} onChange={flip} label={r.active ? `Switch off ${r.title}` : `Switch on ${r.title}`} />}
        </div>
        {link && (
          <div className="rl-reel-acts" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-secondary" onClick={() => copy(link)}>Copy link</button>
            <button type="button" className="btn-secondary" onClick={() => onQr({ url: link, code: r.code, title: r.title })}>QR</button>
          </div>
        )}
      </div>
    </article>
  );
}
