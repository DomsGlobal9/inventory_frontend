import React from 'react';

/**
 * What an offer IS right now -- `effectiveStatus`, not the column. Shared by the list and the offer
 * page so "Ended" means the same thing on both.
 */
export const OFFER_TONE = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',  fg: 'rgb(21,128,61)',   label: 'Running' },
  SCHEDULED: { bg: 'rgba(59,130,246,0.12)', fg: 'rgb(29,78,216)',   label: 'Starts later' },
  DRAFT:     { bg: 'rgba(107,114,128,0.12)',fg: 'rgb(75,85,99)',    label: 'Draft' },
  PAUSED:    { bg: 'rgba(234,179,8,0.15)',  fg: 'rgb(161,98,7)',    label: 'Paused' },
  EXPIRED:   { bg: 'rgba(107,114,128,0.12)',fg: 'rgb(107,114,128)', label: 'Ended' },
  ARCHIVED:  { bg: 'rgba(107,114,128,0.08)',fg: 'rgb(156,163,175)', label: 'Retired' }
};

export default function OfferStatusPill({ status }) {
  const tone = OFFER_TONE[status] ?? OFFER_TONE.DRAFT;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
      backgroundColor: tone.bg, color: tone.fg, whiteSpace: 'nowrap'
    }}>{tone.label}</span>
  );
}
