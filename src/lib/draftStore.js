/**
 * Work in progress, kept on the device until it is finished.
 *
 * A shopkeeper filling in a new saree types a name, picks a dress type, chooses five colours,
 * types the stock for each one and photographs three of them. All of that lived in React state
 * and nowhere else, so a refresh, a closed tab, a flat battery or the end of a shift threw the
 * lot away with nothing to say it had gone -- the step ticks at the top still read "General
 * Information: done" over a form with nothing in it.
 *
 * IndexedDB rather than localStorage, for one reason: photographs. localStorage holds strings,
 * so a File would have to be turned into base64 -- a third bigger, a blocking main-thread
 * conversion on every keystroke's worth of saving, and against a 5MB cap that one phone photo
 * already breaks. IndexedDB stores a File as it is, with a quota in the hundreds of megabytes.
 *
 * Scoped to one person on one shop. A shop's till is shared: the next person to sign in must
 * never find the last person's half-written product waiting for them. The same scoping is what
 * lets the draft SURVIVE a sign-out -- it is not deleted on the way out, it is simply invisible
 * to anybody else, so the person who started it finds it again when they come back.
 */

const DB_NAME = 'scaleezy';
const STORE = 'drafts';
const DB_VERSION = 1;

/** Drafts older than this are swept up on read: a machine should not hoard last spring's saree. */
const KEEP_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Whether this browser will let us store anything at all.
 *
 * A private window, a locked-down device or a browser with site data blocked has no IndexedDB
 * and throws on touch. Every function here answers "nothing saved" in that case rather than
 * breaking: the wizard still works perfectly well in memory, which is exactly what it did
 * before any of this existed.
 */
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      return reject(e);
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
    // A version change from another tab leaves this one holding a connection nobody can upgrade.
    request.onblocked = () => reject(new Error('indexedDB blocked'));
  });
}

function withStore(mode, run) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    // `request.result`, not `.value`. An IDBRequest has no `.value`, so reading one gives
    // undefined rather than an error -- every load quietly answered "no draft saved", and the
    // empty form was then written over the real draft a moment later. It cost the first draft
    // this code was tested with, and it would have cost every one of them silently.
    tx.oncomplete = () => { db.close(); resolve(request?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

/**
 * The key one person's draft is filed under.
 *
 * Both ids, not just the user's: the same person can belong to more than one shop, and a saree
 * half-written for one boutique has no business appearing in the other's wizard.
 *
 * Returns null when nobody is signed in, which every caller treats as "do nothing" -- writing a
 * draft under a guessed key is how it would end up visible to the wrong person.
 */
export function draftKeyFor(clientId, userId, name = 'new-product') {
  if (!clientId || !userId) return null;
  return `${clientId}:${userId}:${name}`;
}

/** What was saved under this key, or null. Never throws. */
export async function loadDraft(key) {
  if (!key) return null;
  try {
    const row = await withStore('readonly', store => store.get(key));
    if (!row) return null;
    // Too old to still be what they meant. Removed rather than returned, so the answer to
    // "is there a draft" is the same on this read and the next one.
    if (!row.savedAt || Date.now() - row.savedAt > KEEP_FOR_MS) {
      await clearDraft(key);
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

/**
 * Saves a draft, and says whether it worked.
 *
 * The caller wants to know: a draft that silently failed to save is worse than one that was
 * never offered, because the person believes their work is safe. Quota is the realistic
 * failure -- several phone photographs of several colours add up -- and it arrives as a
 * QuotaExceededError from the transaction rather than from the call.
 */
export async function saveDraft(key, value) {
  if (!key) return false;
  try {
    await withStore('readwrite', store => store.put({ ...value, savedAt: Date.now() }, key));
    return true;
  } catch {
    return false;
  }
}

export async function clearDraft(key) {
  if (!key) return;
  try {
    await withStore('readwrite', store => store.delete(key));
  } catch {
    /* nothing was saved either */
  }
}
