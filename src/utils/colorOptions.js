/**
 * Reading the catalogue's colours, in one place.
 *
 * There were three copies of this: the Add Product wizard, the preview screen it hands off
 * to, and the Generate Variants panel on an existing product. Each derived a shade's label
 * for itself, and they had already drifted -- the panel numbered shades ("Red Shade 8") after
 * a fix, while the wizard still called every shade of a colour the same thing ("Blue Shade",
 * seven times over). That label is not cosmetic: it is stored on the variant, printed on the
 * purchase order the supplier reads, and shortened into the SKU.
 *
 * Shades now carry a name from the server (see backend lib/colorNames.ts). This module is how
 * the screens read it, and the only reason the three cannot drift again.
 */

/** Hex, casing and all, reduced to one comparable form. */
const hex = (value) => String(value || '').trim().toLowerCase();

/**
 * The shades of one catalogue colour, as `{ hex, name }`.
 *
 * Tolerates the old shape -- a bare hex string -- because a browser holding a cached copy of
 * the catalogue from before the change would otherwise render a list of nameless shades.
 */
export function shadesOf(color) {
  if (!Array.isArray(color?.shades)) return [];
  return color.shades
    .map((shade, index) => (
      typeof shade === 'string'
        ? { hex: hex(shade), name: `${color.name} Shade ${index + 1}` }
        : { hex: hex(shade?.hex), name: String(shade?.name || `${color.name} Shade ${index + 1}`) }
    ))
    .filter(s => s.hex);
}

/**
 * The code a selected shade is tracked by while the form is open.
 *
 * Built from the colour's code rather than its label: a shop that adds "Navy Blue" as NAVY
 * would otherwise get codes keyed on "navy blue", which matches nothing.
 */
export function shadeCodeFor(color, shadeHex) {
  return `${color.code}_${hex(shadeHex)}`;
}

/**
 * What a selected code means: its name, and the colour to draw.
 *
 * Resolved against the palette rather than parsed out of the code. Parsing is what produced
 * "Blue Shade" -- the code carries a hex, and a hex on its own has no name in it.
 */
export function colorInfoFor(code, colors) {
  const base = colors.find(c => c.code === code);
  if (base) return { name: base.name, value: base.value, isShade: false };

  for (const color of colors) {
    for (const shade of shadesOf(color)) {
      if (shadeCodeFor(color, shade.hex) === code) {
        return { name: shade.name, value: shade.hex, isShade: true, baseName: color.name };
      }
    }
  }

  // A shade that was selected and then removed from the catalogue, or a code from a browser
  // tab left open across the change. Showing the hex is better than showing nothing: it is at
  // least the colour they picked, and it stops the chip rendering as a blank grey pill.
  const legacy = /_(#[0-9a-f]{3,6})$/i.exec(code);
  if (legacy) return { name: legacy[1].toUpperCase(), value: legacy[1], isShade: true };

  return { name: code, value: '#808080', isShade: false };
}
