/**
 * Which panel offers which colour, and what it generates from.
 *
 * Two panels decide this between them, and for a long time they each had their own copy of the
 * rules. That cost two bugs worth remembering, and this file exists so neither can come back:
 *
 *   both at once   "CHOOSE A FLAT-LAY" and "MAKE THIS COLOUR" side by side on screen, both
 *                  pointing at Red, because the two copies disagreed about what counted as a
 *                  colour that still needed doing.
 *   neither        a colour stopped after one view was treated as finished, so nothing offered
 *                  to complete it. The shop was left at 1 of 4 with no button anywhere. Found by
 *                  pressing Stop on a real generation and then looking at the screen.
 *
 * The second is why the exhaustive check below matters more than the worked examples above it.
 * Every colour that is not finished must be offered by exactly ONE panel -- never both, and
 * never none -- and that has to hold for every shape a product's photographs can be in, not
 * just the shapes somebody thought to write a case for.
 *
 *   node scripts/verify-photo-sets.mjs
 */
import {
  VIEW_ORDER, groupByColour, hasWholeSet,
  sourceForViews, sourceForColours, viewsCandidates, colourTargets, progressText
} from '../src/lib/photoSets.js';

let passed = 0, failed = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) { passed++; console.log(`  [PASS] ${name}`); }
  else { failed++; failures.push(name); console.log(`  [FAIL] ${name}${detail ? `  -> ${detail}` : ''}`); }
};

let nextId = 1;
const id = () => `img-${nextId++}`;

/** A colour, described the way the panels see one. */
function colour(name, { own = 0, views = [], primaryOwn = true, rawUpload = false } = {}) {
  const variantId = `var-${name.toLowerCase()}`;
  const images = [];
  for (let i = 0; i < own; i++) {
    images.push({
      id: id(), variantId, generated: false, view: null,
      imageType: rawUpload && i === 0 ? 'RAW_UPLOAD' : 'GALLERY',
      isPrimary: primaryOwn && i === 0
    });
  }
  for (const v of views) {
    images.push({ id: id(), variantId, generated: true, view: v, imageType: 'GALLERY', isPrimary: v === 'front' });
  }
  return { name, hex: null, variantIds: [variantId], images };
}

const names = (list) => list.map(c => c.name).sort().join(', ') || '(none)';

console.log('WHICH PANEL OFFERS WHICH COLOUR\n');

// ── Counting a set ────────────────────────────────────────────────────────────────────────────
console.log('WHAT COUNTS AS FINISHED');

check('four different views is a finished set',
  hasWholeSet(colour('A', { views: VIEW_ORDER }).images));
check('three of them is not',
  !hasWholeSet(colour('A', { views: ['front', 'left', 'right'] }).images));
check('four copies of the front is not a set either',
  !hasWholeSet(colour('A', { views: ['front', 'front', 'front', 'front'] }).images),
  'counted rows instead of views');
check('the shop\'s own photographs are not views',
  !hasWholeSet(colour('A', { own: 4 }).images));
check('a half-made colour can say where it got to',
  progressText(colour('A', { views: ['front', 'left'] })) === '2 of 4',
  progressText(colour('A', { views: ['front', 'left'] })));

// ── The ordinary shapes ───────────────────────────────────────────────────────────────────────
console.log('\nTHE ORDINARY SHAPES');

let colours = [colour('Rust', { own: 1 }), colour('Indigo')];
check('a fresh product: both colours are offered the views panel',
  names(viewsCandidates(colours)) === 'Indigo, Rust', names(viewsCandidates(colours)));
check('  ...and the colours panel offers nothing, having nothing to copy from',
  colourTargets(colours).length === 0, names(colourTargets(colours)));

colours = [colour('Rust', { own: 1, views: VIEW_ORDER }), colour('Indigo')];
check('after Rust is finished: the views panel drops it',
  !viewsCandidates(colours).some(c => c.name === 'Rust'), names(viewsCandidates(colours)));
check('  ...and Indigo moves to the colours panel',
  names(colourTargets(colours)) === 'Indigo', names(colourTargets(colours)));
check('  ...copied from Rust',
  sourceForColours(colours)?.colour.name === 'Rust');

// ── The gap this file was written for ─────────────────────────────────────────────────────────
console.log('\nA COLOUR THAT WAS STOPPED PART-WAY');

colours = [colour('Rust', { own: 1, views: VIEW_ORDER }), colour('Indigo', { views: ['front'] })];
check('a colour stopped at 1 of 4 is still offered somewhere',
  viewsCandidates(colours).concat(colourTargets(colours)).some(c => c.name === 'Indigo'),
  'it was offered by neither -- this is the bug');
check('  ...by the views panel, because its own front view is a picture of it',
  names(viewsCandidates(colours)) === 'Indigo', names(viewsCandidates(colours)));
check('  ...and not by the colours panel as well',
  !colourTargets(colours).some(c => c.name === 'Indigo'), names(colourTargets(colours)));
check('  ...working from that front view',
  sourceForViews(colours[1])?.view === 'front');

colours = [colour('Rust', { own: 1, views: VIEW_ORDER }), colour('Indigo', { views: ['left'] })];
check('stopped before the front arrived: the colours panel fills it from Rust instead',
  names(colourTargets(colours)) === 'Indigo', names(colourTargets(colours)));
check('  ...and the views panel leaves it alone',
  !viewsCandidates(colours).some(c => c.name === 'Indigo'), names(viewsCandidates(colours)));

colours = [colour('Rust', { own: 1, views: ['front', 'left'] }), colour('Indigo')];
check('the shop\'s OWN colour stopped at 2 of 4 is offered again',
  viewsCandidates(colours).some(c => c.name === 'Rust'), names(viewsCandidates(colours)));
check('  ...from their own photograph, not from the view we made',
  sourceForViews(colours[0])?.generated === false,
  'it would have generated from a generated picture');

// ── What each is made from ────────────────────────────────────────────────────────────────────
console.log('\nWHAT IT IS MADE FROM');

const withFlatLay = colour('A', { own: 2, rawUpload: true });
check('a flat-lay handed over for the job wins',
  sourceForViews(withFlatLay)?.imageType === 'RAW_UPLOAD');

const withPrimary = colour('B', { own: 2 });
check('otherwise the main photograph',
  sourceForViews(withPrimary)?.isPrimary === true);

const noPrimary = colour('C', { own: 2, primaryOwn: false });
check('otherwise any photograph of theirs',
  sourceForViews(noPrimary)?.generated === false && !sourceForViews(noPrimary)?.isPrimary);

const deletedTheirs = colour('D', { views: ['front', 'left'] });
check('and if they deleted theirs after generating, the front view we made',
  sourceForViews(deletedTheirs)?.view === 'front');

check('a colour with nothing at all has no source',
  sourceForViews(colour('E')) === null);

const partialAndWhole = [colour('Half', { views: ['front'] }), colour('Whole', { own: 1, views: VIEW_ORDER })];
check('an empty colour is copied from a FINISHED set, not a half-made one',
  sourceForColours(partialAndWhole)?.colour.name === 'Whole',
  sourceForColours(partialAndWhole)?.colour.name);

// ── Grouping ──────────────────────────────────────────────────────────────────────────────────
console.log('\nA COLOUR IS ITS SIZES, NOT ONE OF THEM');

const grouped = groupByColour(
  [
    { id: 'v1', colorName: 'Red', hexCode: '#f00' },
    { id: 'v2', colorName: 'red', hexCode: '#f00' },
    { id: 'v3', colorName: 'Blue', hexCode: '#00f' },
    { id: 'v4', colorName: null, hexCode: null }
  ],
  [{ id: 'i1', variantId: 'v2', generated: true, view: 'front', imageType: 'GALLERY', isPrimary: true }]
);
check('sizes of one colour are one entry, whatever the capitals',
  grouped.length === 2, grouped.map(g => g.name).join(', '));
check('  ...and a photograph of one size counts for the colour',
  grouped.find(c => c.name === 'Red').images.length === 1);
check('a variant with no colour is not a colour',
  !grouped.some(c => c.name === null));

// ── The rule that must never break ────────────────────────────────────────────────────────────
console.log('\nEVERY SHAPE A PRODUCT CAN BE IN');

const subsets = [];
for (let mask = 0; mask < 16; mask++) {
  subsets.push(VIEW_ORDER.filter((_, i) => mask & (1 << i)));
}

let combos = 0, bothPanels = 0, neitherPanel = 0;
const examples = { both: null, neither: null };

for (const ownA of [0, 1]) {
  for (const viewsA of subsets) {
    for (const ownB of [0, 1]) {
      for (const viewsB of subsets) {
        combos++;
        const set = [colour('A', { own: ownA, views: viewsA }), colour('B', { own: ownB, views: viewsB })];
        const inViews = new Set(viewsCandidates(set).map(c => c.name));
        const inColours = new Set(colourTargets(set).map(c => c.name));

        for (const c of set) {
          const both = inViews.has(c.name) && inColours.has(c.name);
          if (both) { bothPanels++; examples.both ??= { c: c.name, ownA, viewsA, ownB, viewsB }; }

          if (!hasWholeSet(c.images)) {
            const offered = inViews.has(c.name) || inColours.has(c.name);
            if (!offered) { neitherPanel++; examples.neither ??= { c: c.name, ownA, viewsA, ownB, viewsB }; }
          } else if (inViews.has(c.name) || inColours.has(c.name)) {
            // A finished colour must not be offered: running again would spend the allowance to
            // replace photographs the shop has already seen and kept.
            bothPanels++;
            examples.both ??= { c: c.name, why: 'finished but still offered', ownA, viewsA, ownB, viewsB };
          }
        }
      }
    }
  }
}

check(`no colour is ever offered by both panels (${combos} shapes)`,
  bothPanels === 0, JSON.stringify(examples.both));
check(`no unfinished colour is ever offered by neither (${combos} shapes)`,
  neitherPanel === 0, JSON.stringify(examples.neither));

console.log(`\n${passed} passed, ${failed} failed`);
if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
process.exit(failed > 0 ? 1 : 0);
