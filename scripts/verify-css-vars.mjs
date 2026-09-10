/**
 * Every var(--x) must resolve to something.
 *
 * A custom property that was never defined is not an error in CSS. `background: var(--bg-body)`
 * where --bg-body does not exist is legal, silent, and resolves to nothing -- so the element
 * simply has no background. Nothing warns, the build succeeds, and the failure only shows up
 * when somebody looks at that particular screen on that particular device.
 *
 * This has now cost three separate bugs in this app:
 *
 *   --accent-warning   used in fifteen places, defined in none. Every "low stock" and
 *                      "attention" badge, including the Platform Console's SENSITIVE marker,
 *                      rendered as ordinary body text.
 *   .btn-danger        styled by nothing at all, so destructive buttons were invisible.
 *   --bg-body          the mobile navigation drawer, transparent, with the page blurring
 *                      through the menu. Found on a real phone, not in review.
 *
 * All three are the same shape and none of them would fail a build, a type-check or a test.
 * So: a check, run like the other verify scripts.
 *
 * A var() WITH a fallback -- var(--maybe, #fff) -- is deliberately allowed. That is a decision
 * somebody made, not an accident.
 *
 *   node scripts/verify-css-vars.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const EXTS = ['.css', '.jsx', '.js', '.tsx', '.ts'];

/**
 * Not imported anywhere, so nothing in it is ever applied. Listed rather than silently
 * skipped: if it is ever wired up, this line is the reminder that it needs cleaning first.
 */
const NOT_APPLIED = ['App.css'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.some(e => name.endsWith(e))) out.push(p);
  }
  return out;
}

const files = walk(SRC);

// Anything with a value anywhere counts as defined -- a variable set in a media query or on a
// component still resolves at runtime.
const defined = new Set();
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
}

const missing = new Map();
for (const f of files) {
  const rel = relative(SRC, f).split(sep).join('/');
  if (NOT_APPLIED.includes(rel)) continue;
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,)?/g)) {
    const [, name, fallback] = m;
    if (defined.has(name) || fallback) continue;
    if (!missing.has(name)) missing.set(name, new Set());
    missing.get(name).add(rel);
  }
}

if (missing.size === 0) {
  console.log(`\n  ${defined.size} custom properties defined, every var() resolves.`);
  console.log(`  (skipped, imported nowhere: ${NOT_APPLIED.join(', ')})\n`);
  process.exit(0);
}

console.log('\n  CSS variables used but never defined, with no fallback:\n');
let total = 0;
for (const [name, where] of [...missing].sort()) {
  const files = [...where].sort();
  total += files.length;
  console.log(`    ${name.padEnd(24)} ${files.join(', ')}`);
}
console.log(`\n  ${missing.size} name(s) across ${total} file(s).`);
console.log('  Each one resolves to nothing: no colour, no background, no shadow.');
console.log('  Point it at a property that exists, or give it a fallback if it is deliberate.\n');
process.exit(1);
