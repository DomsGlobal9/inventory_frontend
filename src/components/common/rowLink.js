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
      /*
       * Started on something INSIDE the row that handles its own clicks: leave it alone.
       *
       * `!== e.currentTarget` matters more than it looks. rowToggle gives the row itself
       * role="button", which is in the list above -- so closest() matched the ROW, and every
       * click on it was skipped as if it had landed on a control. The error log's stack traces
       * could not be opened by mouse at all, while the keyboard worked perfectly, because only
       * this branch does the check. Found by clicking one; no build would ever have said a word.
       */
      const control = e.target.closest?.(INTERACTIVE);
      if (control && control !== e.currentTarget) return;
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

/**
 * The same row behaviour for a row that opens underneath itself instead of going anywhere --
 * the error log's stack traces, for example.
 *
 * Kept apart from rowLink rather than given a flag, because the two say different things to a
 * screen reader: a link goes somewhere, a button with aria-expanded opens what is already here.
 * Reading "link" on a row that only unfolds is a promise the row does not keep.
 */
export function rowToggle(toggle, { expanded, label } = {}) {
  if (typeof toggle !== 'function') return {};
  const it = rowLink(toggle, { label });
  return { ...it, role: 'button', 'aria-expanded': !!expanded };
}
