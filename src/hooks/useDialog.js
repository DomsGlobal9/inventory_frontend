import { useEffect, useRef } from 'react';

/**
 * What makes a box on top of the page behave as a dialog for somebody on a keyboard or a screen
 * reader: focus goes into it when it opens, Tab and Shift+Tab stay inside it, Escape closes it, and
 * focus goes back to whatever opened it when it closes.
 *
 * Without this the confirm boxes were plain divs: Tab walked straight out of "Cancel this order?"
 * into the page behind it, and Escape did nothing.
 *
 * Returns a ref for the dialog box. The caller still sets role="dialog", aria-modal and
 * aria-labelledby on it -- the words belong to the dialog, not to this hook.
 *
 * `onClose` is not called while `canClose` is false (an action still running), and `initialFocus`
 * is a selector for what to focus first; otherwise the first field or button in the box.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialogs open on top of each other (a confirm over a form). Only the top one answers keys.
const stack = [];

export function useDialog(isOpen, { onClose, canClose = true, initialFocus } = {}) {
  const ref = useRef(null);
  // Read from the key handler, which is attached once per opening; these can change meanwhile.
  const latest = useRef({ onClose, canClose });
  latest.current = { onClose, canClose };

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    const token = {};
    stack.push(token);

    const focusables = () => [...(ref.current?.querySelectorAll(FOCUSABLE) ?? [])]
      .filter(el => el.getClientRects().length > 0);

    // After the first paint, so the box and anything it autofocuses are there. A field the dialog
    // focused itself (a "type DELETE to confirm" box) is left where it is.
    const t = setTimeout(() => {
      const box = ref.current;
      if (!box || box.contains(document.activeElement)) return;
      const first = (initialFocus && box.querySelector(initialFocus)) || focusables()[0];
      (first || box).focus?.();
    }, 0);

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token || !ref.current) return;
      if (e.key === 'Escape') {
        // A menu open inside the dialog takes its own Escape first (it prevents the default).
        if (e.defaultPrevented) return;
        if (latest.current.canClose) { e.preventDefault(); latest.current.onClose?.(); }
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); ref.current.focus?.(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = ref.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const at = stack.indexOf(token);
      if (at >= 0) stack.splice(at, 1);
      // Back to the button that opened it, if it is still on the page -- a row that the action
      // removed has nowhere to return to, and the browser then starts from the top as usual.
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}
