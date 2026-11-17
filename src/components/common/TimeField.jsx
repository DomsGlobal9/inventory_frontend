import React from 'react';
import Select from './Select';

/**
 * A time box the app draws itself, in place of <input type="time"> (17 Nov 2026, owner: no native controls).
 *
 * The browser's time box has its own clock button and spinner, and shows "21:30" or "09:30 PM" depending on the
 * computer. This is the app's own dropdown (common/Select: keyboard, type-to-jump) listing times every `step`
 * minutes as "9:30 pm". A saved time that is not on the step (say 9:07) is kept and listed in its place.
 *
 * Same value as the native one: 'HH:MM' (24-hour), or '' for none. onChange is given the new value.
 */
const pad = (n) => String(n).padStart(2, '0');
export const showTime = (v) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ''));
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
};

export default function TimeField({ value, onChange, step = 15, disabled, id, className = '', style, placeholder = 'Pick a time', 'aria-label': ariaLabel }) {
  const times = [];
  for (let m = 0; m < 24 * 60; m += step) times.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  const v = /^\d{2}:\d{2}/.exec(String(value || ''))?.[0] || '';
  if (v && !times.includes(v)) { times.push(v); times.sort(); }
  return (
    <Select id={id} value={v} onChange={(e) => onChange?.(e.target.value)} disabled={disabled} className={className} style={style} aria-label={ariaLabel}>
      {!v && <option value="" disabled>{placeholder}</option>}
      {times.map(t => <option key={t} value={t}>{showTime(t)}</option>)}
    </Select>
  );
}
