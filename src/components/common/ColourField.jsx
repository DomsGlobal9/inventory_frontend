import React, { useRef, useState } from 'react';
import Popover from './Popover';

/**
 * A colour swatch the app draws itself, in place of <input type="color"> (17 Nov 2026, owner: no native controls).
 *
 * The browser's colour box opens the operating system's colour window (Windows' grey "Edit colours" box). This opens
 * a grid of the colours garments actually come in; the exact shade is still typed as a hex code in the box beside it.
 * onChange is given '#RRGGBB'.
 */
export const GARMENT_COLOURS = [
  ['Maroon', '#7B1E2B'], ['Red', '#C62828'], ['Rani pink', '#D81B60'], ['Pink', '#F06292'], ['Peach', '#F7B7A3'], ['Coral', '#F26B5B'],
  ['Rust', '#B7472A'], ['Orange', '#EF6C00'], ['Mustard', '#D4A017'], ['Yellow', '#F9D71C'], ['Cream', '#F3E9D2'], ['Beige', '#D9C3A0'],
  ['Mehendi', '#7A8B2E'], ['Parrot green', '#5FB33A'], ['Bottle green', '#0B5D3B'], ['Mint', '#A8DCC0'], ['Teal', '#00796B'], ['Rama green', '#1B8C8C'],
  ['Sky blue', '#7EC8E3'], ['Blue', '#1E5BB8'], ['Navy', '#1B2A4A'], ['Peacock blue', '#005F73'], ['Lavender', '#B9A3D9'], ['Purple', '#6A2C91'],
  ['Wine', '#5E1A2E'], ['Magenta', '#A3126B'], ['Brown', '#6D4C3D'], ['Coffee', '#4B3621'], ['Gold', '#C9A13B'], ['Silver', '#BFC1C2'],
  ['White', '#FFFFFF'], ['Off white', '#F5F1E8'], ['Grey', '#8C8C8C'], ['Charcoal', '#36454F'], ['Black', '#111111'], ['Copper', '#B4643C'],
];

export default function ColourField({ value, onChange, size = 48, label = 'Pick a colour', disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hex = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#000000';
  const pick = (h) => { onChange?.(h); setOpen(false); ref.current?.focus(); };
  return (
    <>
      <button ref={ref} type="button" className="cf-swatch" aria-label={`${label}: ${hex}`} title={label} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open}
        style={{ width: size, height: size, background: hex }} onClick={() => setOpen(o => !o)} />
      <Popover anchorRef={ref} open={open} onClose={(o) => { setOpen(false); if (o?.refocus) ref.current?.focus(); }} label={label} className="cf-pop">
        <div className="cf-grid">
          {GARMENT_COLOURS.map(([name, h]) => (
            <button key={h} type="button" className={`cf-dot${h.toLowerCase() === String(value || '').toLowerCase() ? ' cf-on' : ''}`}
              style={{ background: h }} title={name} aria-label={name} onClick={() => pick(h)} />
          ))}
        </div>
        <p className="cf-note">For an exact shade, type its code in the box beside the swatch.</p>
      </Popover>
    </>
  );
}
