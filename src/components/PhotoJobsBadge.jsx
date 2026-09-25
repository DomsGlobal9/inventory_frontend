import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, X } from 'lucide-react';
import { usePhotoJobNotices, useMarkPhotoJobsSeen } from '../hooks/usePhotoJobs';

/**
 * "Your photographs are ready" -- wherever in the app they happen to be.
 *
 * This is the half of the change the shop actually feels. Making the photographs on the server
 * is what lets them walk away; this is what makes walking away safe, because the answer comes
 * and finds them instead of waiting on a screen they have left.
 *
 * It follows from the job row, so all of these work without anything extra:
 *   - it finished while they were on Orders taking a counter sale
 *   - it finished while they were signed out, and they see it at the next sign-in
 *   - ten finished while they were at lunch, and that is one line rather than ten
 *
 * PORTALLED, and that is not decoration. The page content sits inside a motion.div that
 * animates opacity and transform on every navigation, and both of those create a containing
 * block -- a position:fixed child is positioned against THAT rather than the window, and fades
 * with it. Rendered in place, this notice would slide about and flicker on every page change.
 *
 * Below the modals at 1000, deliberately. If somebody is in the middle of a dialog, a notice
 * about something else must not sit on top of it.
 */
export default function PhotoJobsBadge() {
  const navigate = useNavigate();
  const { data } = usePhotoJobNotices();
  const markSeen = useMarkPhotoJobsSeen();

  const unseen = data?.unseen ?? [];
  if (unseen.length === 0) return null;

  const done = unseen.filter(j => j.status === 'DONE');
  const failed = unseen.filter(j => j.status === 'FAILED');
  const first = done[0] ?? unseen[0];
  const bad = done.length === 0;

  // One line, whatever the number. Ten separate notices for ten colours is not ten times as
  // useful; it is a wall of chips over the screen they came back to use.
  const headline = (() => {
    if (unseen.length === 1) {
      return bad
        ? `The ${first.colourName} photographs did not finish`
        : `The ${first.colourName} photographs are ready`;
    }
    if (done.length && failed.length) {
      return `Photographs ready for ${done.length} colour${done.length === 1 ? '' : 's'}, `
        + `${failed.length} did not finish`;
    }
    return bad
      ? `${failed.length} sets of photographs did not finish`
      : `Photographs are ready for ${done.length} colours`;
  })();

  const open = () => {
    navigate(`/products/${first.productId}?tab=images`);
    markSeen.mutate(undefined);
  };

  return createPortal(
    <>
      {/*
        OUTSIDE the live region, deliberately. role="status" is announced when its contents
        change, and a <style> tag inside it puts the keyframes into that element's textContent.
        Nothing renders them and the accessibility tree drops them, so nobody actually hears
        "@keyframes photoJobsIn" -- but a live region whose text is half CSS is one browser
        quirk away from being read out, and there is no reason for it to be in there.
      */}
      <style>{`
        @keyframes photoJobsIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>
    <div
      role="status"
      style={{
        position: 'fixed', left: '16px', bottom: '16px', zIndex: 900,
        maxWidth: 'min(360px, calc(100vw - 32px))',
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 10px 10px 14px', borderRadius: '12px',
        background: 'var(--bg-card)', color: 'var(--text-primary)',
        border: `1px solid ${bad ? '#B45309' : 'var(--accent-primary, #164B1E)'}`,
        boxShadow: '0 10px 30px rgba(0,0,0,.18)',
        animation: 'photoJobsIn .28s ease-out'
      }}
    >
      {bad
        ? <AlertCircle size={18} style={{ flexShrink: 0, color: '#B45309' }} />
        : <Camera size={18} style={{ flexShrink: 0, color: 'var(--accent-primary, #164B1E)' }} />}

      <button
        type="button"
        onClick={open}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, lineHeight: 1.35, flex: 1
        }}
      >
        {headline}
        <span style={{ display: 'block', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}>
          {/* A message is written when there is something to act on -- a partial set, mostly. */}
          {unseen.length === 1 && first.message ? first.message : 'Tap to look at them.'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => markSeen.mutate(undefined)}
        aria-label="Close this notice"
        title="Close"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: '4px', flexShrink: 0
        }}
      >
        <X size={16} />
      </button>
    </div>
    </>,
    document.body
  );
}
