/**
 * Making a whole table row open the thing it is about.
 *
 * Every list in this app put the way in behind one small "View" button at the far right, so
 * opening an order meant reading across the row, finding a 60px target and hitting it. The row
 * itself already looks like the thing; it should behave like it.
 *
 * What this handles that a bare onClick does not:
 *
 *   - a click that STARTED on a button, link, input or dropdown inside the row is left alone, so
 *     "View", a menu, a checkbox or a Select still do their own job and nothing fires twice;
 *   - a click that is really a text SELECTION is left alone, because dragging across an order
 *     number to copy it should copy it, not navigate away;
 *   - the keyboard: the row is focusable and Enter or Space opens it, which a div with an onClick
 *     never is;
 *   - ctrl/cmd/middle click is left to the browser where an href exists, rather than swallowed.
 *
 * Pair it with className="row-link" for the hover and the focus ring (see index.css).
 */

/** Anything inside a row that has its own job when clicked. */
const INTERACTIVE = 'button, a, input, select, textarea, label, [role="button"], [role="listbox"], [contenteditable="true"]';

export function rowLink(open, { label } = {}) {
  if (typeof open !== 'function') return {};

  return {
    className: 'row-link',
    tabIndex: 0,
    role: 'link',
    'aria-label': label,
    onClick: (e) => {
      // Started on something that handles its own clicks: leave it entirely alone.
      if (e.target.closest?.(INTERACTIVE)) return;
      // They were selecting text, not choosing a row.
      if (window.getSelection?.()?.toString()) return;
      open(e);
    },
    onKeyDown: (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target !== e.currentTarget) return;   // a control inside the row has its own keys
      e.preventDefault();
      open(e);
    }
  };
}
