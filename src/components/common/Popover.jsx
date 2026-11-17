import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A small box that opens under (or above) the field that opened it: the date picker's calendar and the colour
 * picker's swatches. Drawn by the app, not the browser (17 Nov 2026, owner: "no native" anywhere).
 *
 * Fixed and portalled into <body> for the same reason as Select's list: a box inside a modal is otherwise clipped by
 * the modal's scrolling body. Below the field when it fits, above when it does not, never past either edge.
 * A press outside, or Escape, closes it; the Escape is taken so a dialog around the field stays open.
 */
export default function Popover({ anchorRef, open, onClose, children, label, className = '' }) {
  const boxRef = useRef(null);
  const [pos, setPos] = useState(null);
  const latestClose = useRef(onClose);
  latestClose.current = onClose;

  const place = useCallback(() => {
    const a = anchorRef.current, box = boxRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const GAP = 4, MARGIN = 8;
    const h = box?.offsetHeight || 320, w = box?.offsetWidth || 280;
    const below = window.innerHeight - r.bottom - GAP - MARGIN;
    const up = below < h && r.top - GAP - MARGIN > below;
    const top = up ? Math.max(MARGIN, r.top - GAP - h) : Math.min(r.bottom + GAP, Math.max(MARGIN, window.innerHeight - MARGIN - h));
    const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - MARGIN - w));
    setPos(p => (p && p.top === top && p.left === left ? p : { top, left }));
  }, [anchorRef]);

  useLayoutEffect(() => { if (open) place(); else setPos(null); }, [open, place]);
  // Measured again once the box has its real size.
  useLayoutEffect(() => { if (open && pos) place(); }, [open, pos, place]);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (boxRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      latestClose.current?.();
    };
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); latestClose.current?.({ refocus: true }); } };
    const move = (e) => { if (!(e?.target instanceof Node && boxRef.current?.contains(e.target))) place(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away, { passive: true });
    document.addEventListener('keydown', esc, true);
    window.addEventListener('scroll', move, true);
    window.addEventListener('resize', move);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
      document.removeEventListener('keydown', esc, true);
      window.removeEventListener('scroll', move, true);
      window.removeEventListener('resize', move);
    };
  }, [open, anchorRef, place]);

  if (!open) return null;
  return createPortal(
    // data-pf-keep: a filter menu (products/ProductFilters useOutside) counts a press in here as inside itself, so
    // picking a day in a date box that sits in a filter menu does not close the menu.
    <div ref={boxRef} role="dialog" aria-label={label} className={`app-popover ${className}`} data-pf-keep=""
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>,
    document.body
  );
}
