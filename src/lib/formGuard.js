/**
 * The check the browser used to do, done by us instead.
 *
 * Every form here marked its fields `required` and let the browser enforce it. That works,
 * but what it shows is the browser's own tooltip -- "Please fill in this field." -- in the
 * operating system's font, anchored to the input, gone on the next click, in whatever
 * language the browser is set to rather than the one the shop uses. It looks like it belongs
 * to Chrome, because it does. The same reason alert() and confirm() were removed from this
 * app applies to it.
 *
 * Taking `required` off would have been the easy move and the wrong one: the fields really
 * are required, and the server would then be the first thing to say so, after a round trip.
 * So the attribute stays, the form carries `noValidate` to stop the browser acting on it, and
 * this reads the same attribute to produce the same answer in the app's own voice.
 *
 * Reading the DOM rather than a per-form list of fields is deliberate. A list would be a
 * second place to remember, and the day somebody adds a field and marks it required, this
 * already knows.
 */

/**
 * What to call a field when telling somebody it is empty.
 *
 * The order matters, and the placeholder is deliberately NOT in it. Placeholders in this app
 * are example VALUES -- "platform-admin@scaleezy.com", "e.g. 1250", "••••••••" -- so falling
 * back to one produced "Please enter the platform-admin@scaleezy.com." A label that is an
 * example of the answer is worse than a generic word.
 *
 * Most fields here are labelled by a <label> that carries no `for` and does not wrap the
 * input -- it sits beside it inside a shared wrapper -- so a plain label[for] lookup finds
 * nothing. Walking up a few levels and taking the first label found is what actually matches
 * how these forms are built.
 */
function labelFor(el, form) {
  const clean = (t) => String(t || '').trim().replace(/\s*\*$/, '').replace(/\s+/g, ' ');

  if (el.id) {
    const byFor = form.querySelector('label[for="' + CSS.escape(el.id) + '"]');
    if (byFor && clean(byFor.textContent)) return clean(byFor.textContent);
  }

  const aria = el.getAttribute('aria-label');
  if (aria && clean(aria)) return clean(aria);

  const wrapping = el.closest('label');
  if (wrapping && clean(wrapping.textContent)) return clean(wrapping.textContent);

  // The common shape here: <div><label>Email Address</label><div><input/></div></div>
  let node = el.parentElement;
  for (let depth = 0; node && node !== form && depth < 4; depth++, node = node.parentElement) {
    const label = node.querySelector('label');
    if (label && clean(label.textContent)) return clean(label.textContent);
  }

  // Last resort: the field's own name, spaced out -- "customerCode" -> "customer code".
  const raw = el.name || el.id;
  if (raw) {
    return clean(raw.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase());
  }
  return 'this field';
}

/**
 * The first required field that has not been filled in, described in words, or null.
 *
 * Checkboxes and radios count as empty when unchecked; everything else when it trims to
 * nothing, so a box holding only spaces is not accepted as an answer.
 */
export function firstMissingField(form) {
  if (!form || typeof form.querySelectorAll !== 'function') return null;
  const fields = form.querySelectorAll('[required]');
  for (const el of fields) {
    /*
     * Skip fields that are not actually on screen -- a collapsed section, a step of a wizard
     * that is not showing.
     *
     * NOT offsetParent === null, which was the first thing written here and is wrong: that is
     * also null for anything inside a position:fixed ancestor, which is every modal in this
     * app and the login card itself. It skipped every field and cheerfully reported nothing
     * missing. getClientRects() is empty only when the element really is not rendered.
     */
    if (el.disabled || el.type === 'hidden' || el.getClientRects().length === 0) continue;
    const empty = (el.type === 'checkbox' || el.type === 'radio')
      ? !el.checked
      : !String(el.value || '').trim();
    if (empty) {
      el.focus();
      return labelFor(el, form);
    }
  }
  return null;
}

/**
 * Message for a missing field, phrased the way the rest of the app speaks: plainly, and
 * naming the thing rather than scolding about the form.
 *
 * Labels are written in Title Case on screen ("Email Address", "Reorder Level"), which reads
 * wrong inside a sentence -- "Please enter the email Address." Each word is lowered unless it
 * is an acronym the shop actually says out loud (SKU, GST, HSN), where the capitals are the
 * name rather than styling.
 */
export function missingFieldMessage(label) {
  const raw = String(label || '').trim();
  if (!raw) return 'Please fill in the field above.';

  const words = raw.split(/\s+/).map((w) => (
    // All-caps and short: an acronym, leave it alone. Anything else is Title Case styling.
    /^[A-Z0-9]{2,5}$/.test(w) ? w : w.toLowerCase()
  ));
  const name = words.join(' ');

  return 'Please enter ' + (/^(the|a|an|your)/i.test(name) ? name : 'the ' + name) + '.';
}
