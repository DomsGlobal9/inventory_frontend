import { useEffect, useRef } from 'react';

/**
 * Hold and drag a row sideways with the mouse.
 *
 * A strip that scrolls sideways is obvious with a finger and awkward with a mouse: there is no
 * horizontal wheel on most of them, and once the scrollbar is hidden there is nothing left to take
 * hold of. So the row itself becomes the handle.
 *
 * Mouse and pen only. Touch is left completely alone -- the browser's own scrolling already
 * follows a finger, with the momentum and the rubber-banding people expect, and every hand-written
 * version of that is worse. Trying to drive touch from JavaScript is how a strip ends up feeling
 * sticky on a cheap Android.
 *
 * The hard part is not the dragging, it is not breaking the click: these rows are made of buttons,
 * and a drag that begins on one must not also press it. So a drag is only a drag once the pointer
 * has moved a few pixels, and when it has, the click that follows is swallowed once -- in the
 * capture phase, before it reaches the button.
 */
export function useDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let down = false;      // a button is held
    let dragging = false;  // ...and has moved far enough to count
    let startX = 0;
    let startLeft = 0;
    const SLOP = 4;        // pixels of movement before a press becomes a drag

    /*
     * Whether the click that is about to arrive belongs to a drag rather than to a press.
     *
     * A flag rather than a listener added when the drag ends: the click is dispatched in a
     * separate task from pointerup, so a listener added and then removed on a zero-delay timer
     * raced it -- sometimes eating the click, sometimes gone before it arrived, which is how a
     * drag across the tabs still opened whichever one it started on. Nothing here is timed now:
     * the flag is set when a drag ends and cleared by the click it was meant for, or by the next
     * press if no click ever comes.
     */
    let eatNextClick = false;

    const onClickCapture = (e) => {
      if (!eatNextClick) return;
      eatNextClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      down = true;
      dragging = false;
      eatNextClick = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };

    const onPointerMove = (e) => {
      if (!down) return;
      const moved = e.clientX - startX;
      if (!dragging && Math.abs(moved) < SLOP) return;
      if (!dragging) {
        dragging = true;
        el.style.cursor = 'grabbing';
        // Held from here on, so the drag survives the pointer leaving the row.
        el.setPointerCapture?.(e.pointerId);
      }
      // Stops the browser selecting the labels as the pointer sweeps across them.
      e.preventDefault();
      el.scrollLeft = startLeft - moved;
    };

    /*
     * Leaving the row only ends a press that has not become a drag yet. Once it has, the pointer
     * is captured and the drag belongs to this row until the button comes up -- a hand that
     * strays above or below the strip mid-sweep is still dragging, and stopping there would make
     * the row feel like it keeps letting go.
     */
    const onPointerLeave = (e) => { if (!dragging) stop(e); };

    const stop = (e) => {
      if (!down) return;
      down = false;
      el.style.cursor = '';
      if (e?.pointerId != null) el.releasePointerCapture?.(e.pointerId);
      // The click this drag is about to produce belongs to the drag, not to the tab under it.
      if (dragging) eatNextClick = true;
      dragging = false;
    };

    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('dragstart', (e) => e.preventDefault());

    return () => {
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointercancel', stop);
      el.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return ref;
}
