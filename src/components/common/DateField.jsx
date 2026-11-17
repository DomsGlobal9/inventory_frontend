import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Popover from './Popover';

/**
 * A date box the app draws itself, in place of <input type="date"> (17 Nov 2026, owner: no native controls).
 *
 * The browser's date box shows its own calendar button and pop-up: Windows' grey calendar on a computer, a system
 * wheel on a phone, and a format that follows the computer's language ("11/17/2026" on one, "17-11-2026" on another).
 * This one always reads "17 Nov 2026" and opens a calendar in the app's look.
 *
 * Same value as the native one: 'YYYY-MM-DD', or '' for none. onChange is given the new value (not an event).
 * `min` / `max` grey out the days outside them. `clearable` adds a Clear button (off for a box that must have a day).
 * Keyboard: Enter or Space or Down opens it; in the calendar the arrows move a day or a week, Page Up / Page Down a
 * month, Home / End the week, Enter picks, Escape closes.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 'YYYY-MM-DD' -> a local Date at midnight, or null. Never through Date.parse, which reads it as UTC. */
export function fromKey(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}
export const showDate = (s) => {
  const d = fromKey(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '';
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
};

export default function DateField({
  value, onChange, min, max, disabled, id, className = '', style, placeholder = 'Pick a date', clearable = true,
  'aria-label': ariaLabel, 'aria-invalid': ariaInvalid
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef(null);
  const gridRef = useRef(null);
  const lo = fromKey(min), hi = fromKey(max);
  const today = useMemo(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = fromKey(value);
  const clamp = (d) => (lo && d < lo ? lo : hi && d > hi ? hi : d);
  const [focus, setFocus] = useState(() => clamp(chosen || today));
  const outside = (d) => (lo && d < lo) || (hi && d > hi);

  const openIt = () => { if (disabled) return; setFocus(clamp(chosen || today)); setOpen(true); };
  // Focus goes back to the box after a pick or Escape; a press elsewhere leaves focus where that press put it.
  const close = (opts) => { setOpen(false); if (opts?.refocus) fieldRef.current?.focus(); };
  const pick = (d) => { if (outside(d)) return; onChange?.(dateKey(d)); close({ refocus: true }); };

  // The day with focus is the one the keyboard is on: focus follows it as it moves.
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => gridRef.current?.querySelector(`[data-day="${dateKey(focus)}"]`)?.focus());
    return () => cancelAnimationFrame(t);
  }, [open, focus]);

  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  // Six rows only when the month needs them.
  const rows = cells[35].getMonth() === focus.getMonth() ? 6 : 5;

  const onGridKey = (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next = null;
    if (moves[e.key] != null) next = addDays(focus, moves[e.key]);
    else if (e.key === 'PageUp') next = addMonths(focus, -1);
    else if (e.key === 'PageDown') next = addMonths(focus, 1);
    else if (e.key === 'Home') next = addDays(focus, -focus.getDay());
    else if (e.key === 'End') next = addDays(focus, 6 - focus.getDay());
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(focus); return; }
    else return;
    e.preventDefault();
    setFocus(next);
  };

  const prevOff = lo && new Date(focus.getFullYear(), focus.getMonth(), 0) < lo;
  const nextOff = hi && new Date(focus.getFullYear(), focus.getMonth() + 1, 1) > hi;
  const shown = showDate(value);

  return (
    <>
      <button
        ref={fieldRef}
        id={id}
        type="button"
        className={`input-field df-field ${shown ? '' : 'df-empty'} ${className.replace(/\binput-field\b/g, '')}`}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel}${shown ? `: ${shown}` : ''}` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        data-value={value || ''}
        onClick={() => (open ? close({ refocus: true }) : openIt())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openIt(); } }}
      >
        <span className="df-text">{shown || placeholder}</span>
        <Calendar size={15} aria-hidden="true" className="df-icon" />
      </button>
      <Popover anchorRef={fieldRef} open={open} onClose={close} label={ariaLabel || 'Choose a date'} className="df-pop">
        <div className="df-head">
          <button type="button" className="df-nav" aria-label="Previous month" disabled={prevOff} onClick={() => setFocus(clamp(addMonths(focus, -1)))}><ChevronLeft size={16} /></button>
          <span className="df-month" aria-live="polite">{MONTHS[focus.getMonth()]} {focus.getFullYear()}</span>
          <button type="button" className="df-nav" aria-label="Next month" disabled={nextOff} onClick={() => setFocus(clamp(addMonths(focus, 1)))}><ChevronRight size={16} /></button>
        </div>
        <div role="grid" aria-label={`${MONTHS[focus.getMonth()]} ${focus.getFullYear()}`} ref={gridRef} onKeyDown={onGridKey}>
          <div role="row" className="df-row">
            {DAYS.map(d => <span key={d} role="columnheader" className="df-dow">{d}</span>)}
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div role="row" className="df-row" key={r}>
              {cells.slice(r * 7, r * 7 + 7).map(d => {
                const k = dateKey(d);
                const off = outside(d);
                const isChosen = chosen && k === dateKey(chosen);
                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    data-day={k}
                    tabIndex={k === dateKey(focus) ? 0 : -1}
                    aria-selected={!!isChosen}
                    aria-disabled={off || undefined}
                    aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`}
                    className={`df-day${d.getMonth() !== focus.getMonth() ? ' df-other' : ''}${isChosen ? ' df-chosen' : ''}${k === dateKey(today) ? ' df-today' : ''}${off ? ' df-off' : ''}`}
                    onClick={() => (off ? setFocus(d) : pick(d))}
                  >{d.getDate()}</button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="df-foot">
          {!outside(today) && <button type="button" className="df-link" onClick={() => pick(today)}>Today</button>}
          {clearable && value && <button type="button" className="df-link" onClick={() => { onChange?.(''); close({ refocus: true }); }}>Clear</button>}
        </div>
      </Popover>
    </>
  );
}
