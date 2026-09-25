/**
 * Which colours still need photographs, which panel should offer them, and what each is made from.
 *
 * These rules were written twice, once inside each panel, and the two had to agree about what
 * counts or both would offer to fill the same colour -- which happened, and put "CHOOSE A
 * FLAT-LAY" and "MAKE THIS COLOUR" side by side on screen, both pointing at Red. They are in one
 * file now so that cannot come back, and so they can be tested without a browser.
 *
 * The rule they got wrong for longer: a colour was treated as finished if it had ANY generated
 * view. That was a fair proxy while a generation could only ever run to the end -- somebody had
 * to sit and watch it, so it either finished or the work vanished. Now that the work happens on
 * the server, Stop is a normal thing to press and a set really can sit at one view out of four.
 * Under the old rule that colour was "finished", so nothing offered to complete it and the shop
 * was stuck with a quarter of a set and no button.
 *
 * Deliberately free of imports: this is arithmetic about a product's photographs, and keeping it
 * that way is what lets scripts/verify-photo-sets.mjs run it under plain node.
 */

/** The four views a catalogue wants, in the order a set is shown in. */
export const VIEW_ORDER = ['front', 'left', 'right', 'back'];

/**
 * Which model family a garment belongs to, or nothing.
 *
 * The Try-On API supports these five and no others. Menswear, kids' sets, western wear and the
 * catch-all types like "Wedding" have no matching model, and the old behaviour of quietly
 * defaulting them to KURTI produced nonsense for garments that were nothing like a kurti.
 * Nothing here means the shop is told plainly rather than charged for a picture of the wrong
 * thing.
 *
 * It arrived here from lib/catalogGeneration.js, which is gone. That file also held
 * streamCatalog -- the stream reader that made generation happen inside the browser tab, which
 * is what forced somebody to sit and watch it. Nothing in this app generates in the browser any
 * more, so the file went rather than being left for the next person to call.
 *
 * The server asks the same question of the same dress type in
 * backend/src/services/photo-jobs/catalog.ts. The two must give the same answer, or a colour the
 * screen offered would be refused the moment it was asked for.
 */
export function resolveTryOnCategory(dressType) {
  const dt = (dressType || '').toLowerCase();
  if (dt.includes('saree')) return 'SAREE';
  if (dt.includes('anarkali')) return 'ANARKALI';
  if (dt.includes('lehanga') || dt.includes('lehenga')) return 'LEHANGA';
  if (dt.includes('sharara')) return 'SHARARA';
  if (dt.includes('kurti') || dt.includes('kurta')) return 'KURTI';
  return null;
}

/**
 * One entry per COLOUR, each carrying its variants and its photographs.
 *
 * A colour is several variants -- red/S, red/M and red/L -- and they share one set of
 * photographs. Everything here works in colours for that reason: asking per variant would
 * generate the same pictures three times over and charge for all three.
 */
export function groupByColour(variants, images) {
  const byColour = new Map();
  for (const v of variants || []) {
    const name = v.colorName || null;
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byColour.has(key)) byColour.set(key, { name, hex: v.hexCode || null, variantIds: [], images: [] });
    byColour.get(key).variantIds.push(v.id);
  }
  for (const img of images || []) {
    for (const c of byColour.values()) if (c.variantIds.includes(img.variantId)) c.images.push(img);
  }
  return [...byColour.values()];
}

/** The shop's own photographs: what they uploaded, including a flat-lay handed over to generate from. */
export function ownPhotosOf(images) {
  return (images || []).filter(i => !i.generated);
}

/** Which of the four views have actually been made. */
export function viewsMadeFor(images) {
  return new Set((images || []).filter(i => i.generated && i.view).map(i => i.view));
}

/** A finished set: all four. Anything less is worth offering to complete. */
export function hasWholeSet(images) {
  const made = viewsMadeFor(images);
  return VIEW_ORDER.every(v => made.has(v));
}

/**
 * Can this colour be photographed from something it already has?
 *
 * Either the shop's own picture of it, or -- for a set that stopped part-way -- the front view
 * that was made before it stopped. The front is a picture of this garment in this colour, which
 * is exactly what the studio wants to work from, so a half-made colour completes itself rather
 * than being recoloured from a different one.
 */
export function canWorkAlone(colour) {
  return ownPhotosOf(colour.images).length > 0 || viewsMadeFor(colour.images).has('front');
}

/**
 * What to generate this colour FROM, in the order that respects what the shop meant.
 *
 * A flat-lay handed over for the job comes first, then the main photograph, then any other
 * photograph of theirs -- and only after all of those, the front view we made earlier. Their own
 * picture always wins: generating from a generated picture copies its mistakes, and a shop that
 * uploaded a photograph expects that photograph to be the one used.
 *
 * The server works this out again for itself, because it runs with nobody here. The two must stay
 * the same, or the picture named on screen and the picture the job used would be different ones.
 */
export function sourceForViews(colour) {
  const own = ownPhotosOf(colour.images);
  return own.find(i => i.imageType === 'RAW_UPLOAD')
    ?? own.find(i => i.isPrimary)
    ?? own[0]
    // Nothing of its own left -- either it never had one, or the shop deleted the photograph
    // after generating from it. The front view is then the best likeness we hold.
    ?? colour.images.find(i => i.generated && i.view === 'front')
    ?? colour.images[0]
    ?? null;
}

/**
 * The colour an empty one is copied from: a finished set for preference, otherwise any colour
 * that has a front view.
 *
 * Preferring a whole set is not fussiness. A colour whose own set stopped after one view is
 * usable as a source, but it is also a colour still waiting to be finished, and taking it as the
 * source would quietly make it look like the reference copy rather than the problem.
 */
export function sourceForColours(colours) {
  const frontOf = (c) => c.images.find(i => i.generated && i.view === 'front');
  const whole = colours.find(c => hasWholeSet(c.images) && frontOf(c));
  if (whole) return { colour: whole, front: frontOf(whole) };
  const any = colours.find(c => frontOf(c));
  return any ? { colour: any, front: frontOf(any) } : null;
}

/**
 * The colours the "four catalog views" panel should offer.
 *
 * A colour belongs here when its set is unfinished AND it has something of its own to work from
 * -- or when it has nothing at all and there is no other colour to copy from either, which is the
 * case the flat-lay upload exists for.
 */
export function viewsCandidates(colours) {
  return (colours || []).filter(c => {
    if (hasWholeSet(c.images)) return false;
    if (canWorkAlone(c)) return true;
    // Nothing of its own: only worth a flat-lay when no OTHER colour can fill it instead.
    return !colours.some(o => o !== c && o.images.some(i => i.generated && i.view === 'front'));
  });
}

/**
 * The colours the "colours with no photograph" panel should offer.
 *
 * The exact complement of the rule above, which is the point: a colour that can work from
 * something of its own is handled there, and one that cannot is handled here. Nothing can fall
 * into both lists, so the shop is never shown two buttons for the same colour.
 */
export function colourTargets(colours) {
  if (!sourceForColours(colours || [])) return [];
  return (colours || []).filter(c =>
    !hasWholeSet(c.images) && !canWorkAlone(c) && c.variantIds.length > 0
  );
}

/** "2 of 4", for telling a shop where a half-made colour got to. */
export function progressText(colour) {
  return `${viewsMadeFor(colour.images).size} of ${VIEW_ORDER.length}`;
}
