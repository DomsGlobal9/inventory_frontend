/**
 * What a shop owner is allowed to see when something fails.
 *
 * The four model shots are made by a separate service, which is itself calling an image
 * model. When that chain breaks anywhere along it, the message that comes back is written
 * for whoever is on call -- "Gemini API produced no response after retries.", a 502 from a
 * proxy, sometimes a whole HTML error page in a response body. Printing that on the screen
 * of somebody photographing sarees in their shop tells them nothing they can act on, and
 * names vendors they have no relationship with and cannot ring up.
 *
 * So nothing that came off the wire is ever shown. The real error still goes to
 * console.error for us. The shop owner gets one of the sentences below, and every one of
 * them says the same two things: your photos are safe, and here is what to do next.
 *
 * Matching is on the raw text rather than a status code because the failure can arrive as
 * an Error, a fetch rejection, or a line of JSON from the stream -- by the time it reaches
 * here, the only thing they reliably share is words.
 */

const SAFE = 'Your photos are safe';

const RULES = [
  // The upstream gave up. By far the most common one, and genuinely worth retrying.
  {
    when: /no response after retries|timed? ?out|etimedout|deadline|took too long/,
    say: `The photo studio did not answer in time. ${SAFE} — please try again in a minute.`
  },
  // Nothing left this machine.
  {
    when: /failed to fetch|network ?error|err_connection|econnrefused|enotfound|offline|dns/,
    say: `We could not reach the photo studio. Check the internet connection and try again — ${SAFE.toLowerCase()}.`
  },
  // Busy or over the allowance.
  {
    when: /quota|rate ?limit|too many requests|\b429\b|overloaded|unavailable|\b503\b/,
    say: `The photo studio is busy right now. ${SAFE} — please try again in a few minutes.`
  },
  // Something is wrong with this shop's access, which the shop owner cannot fix alone.
  {
    when: /unauthor|forbidden|api ?key|invalid key|credential|\b401\b|\b403\b/,
    say: `The photo studio did not accept this shop's account. ${SAFE} — please contact support.`
  },
  // The picture itself is the problem, and swapping it is something they can actually do.
  {
    when: /payload too large|\b413\b|file too large|too large|exceeds/,
    say: 'That photo is too big to send. Please use a smaller one, or take it again at a lower size.'
  },
  {
    when: /unsupported|not an image|invalid image|decode|corrupt/,
    say: 'That photo could not be read. Please upload an ordinary JPG or PNG picture.'
  }
];

const FALLBACK = `The model shots could not be made just now. ${SAFE} — please try again.`;

/**
 * Turn whatever went wrong into one sentence a shop owner can act on.
 * Pass the original error to console.error yourself; this deliberately throws it away.
 */
export function plainGenerationError(err) {
  const raw = String(err?.message ?? err ?? '').toLowerCase();
  return (RULES.find(r => r.when.test(raw)) || { say: FALLBACK }).say;
}
