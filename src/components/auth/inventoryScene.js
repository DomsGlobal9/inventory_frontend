/**
 * The picture beside the sign-in form: what Inventory does, in one small isometric scene.
 *
 * A supplier's truck, a saree rack and the stock board, each on its own rounded base. A crate leaves
 * the truck and goes onto the rack, the count on the board goes up, one colour runs low. The caption
 * under it says each step in words (see AuthScene.jsx), so the motion means something.
 *
 * Drawn here as plain SVG (no library, nothing loaded): every solid is a rounded rectangle in plan,
 * extruded and projected at 30 degrees, with three shades (top, left, right), one line weight and a
 * soft shadow, so it reads as a drawing rather than as boxes. Colours are CSS variables (scene.css
 * in AuthScene.jsx), so it follows the light and dark themes.
 */

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const OX = 300;
const OY = 92;

/** Plan (x, y) and height z to the page. */
const P = (x, y, z = 0) => [OX + (x - y) * COS, OY + (x + y) * SIN - z];
const f = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(([a, b]) => `${f(a)},${f(b)}`).join(' ');

/** A rounded rectangle in plan as points, clockwise, each with its outward normal. */
function outline(x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  const corners = [
    [x1 - r, y0 + r, -Math.PI / 2], // back-right
    [x1 - r, y1 - r, 0],            // front (towards the viewer)
    [x0 + r, y1 - r, Math.PI / 2],  // front-left
    [x0 + r, y0 + r, Math.PI]       // back-left
  ];
  const out = [];
  const steps = r > 0 ? 7 : 0;
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (Math.PI / 2) * (steps ? i / steps : 0);
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
    }
  }
  return out;
}

/**
 * One extruded rounded solid. `top`, `left`, `right` are CSS colours (usually var(--…)).
 * Sides are drawn segment by segment so the rounded corners shade smoothly from one face to the other.
 */
export function solid({ x, y, z = 0, w, d, h, r = 4, top, left, right, line = 'var(--sc-line)', shadow = false, extra = '' }) {
  const o = outline(x, y, x + w, y + d, r);
  let s = '';
  if (shadow) {
    const sh = outline(x + 10, y + 14, x + w + 10, y + d + 14, r + 6).map(p => P(p.x, p.y, z));
    s += `<polygon points="${pts(sh)}" style="fill:var(--sc-shadow)" filter="url(#sc-blur)"/>`;
  }
  // Sides: only the segments facing the viewer (normal towards +x or +y).
  for (let i = 0; i < o.length; i++) {
    const a = o[i], b = o[(i + 1) % o.length];
    const nx = (a.nx + b.nx) / 2, ny = (a.ny + b.ny) / 2;
    if (nx + ny <= 0.001) continue;
    const fill = nx > ny ? right : left;
    const quad = [P(a.x, a.y, z + h), P(b.x, b.y, z + h), P(b.x, b.y, z), P(a.x, a.y, z)];
    s += `<polygon points="${pts(quad)}" style="fill:${fill};stroke:${fill};stroke-width:.6"/>`;
  }
  // Silhouette: the lower front edge and the two outer verticals, then the top face on top of it all.
  const front = o.filter((p, i) => { const q = o[(i + 1) % o.length], pr = o[(i - 1 + o.length) % o.length]; return (p.nx + p.ny > 0.001) || (q.nx + q.ny > 0.001) || (pr.nx + pr.ny > 0.001); });
  const byU = [...o].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  const L = byU[0], R = byU[byU.length - 1];
  const lowerRun = [];
  // Walk the outline from the leftmost to the rightmost point the way that passes the front.
  const iL = o.indexOf(L), iR = o.indexOf(R);
  for (let i = iR; ; i = (i + 1) % o.length) { lowerRun.push(P(o[i].x, o[i].y, z)); if (i === iL) break; }
  s += `<polyline points="${pts(lowerRun)}" style="fill:none;stroke:${line};stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round"/>`;
  for (const p of [L, R]) {
    const [ax, ay] = P(p.x, p.y, z), [bx, by] = P(p.x, p.y, z + h);
    s += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" style="stroke:${line};stroke-width:1.2;stroke-linecap:round"/>`;
  }
  void front;
  s += `<polygon points="${pts(o.map(p => P(p.x, p.y, z + h)))}" style="fill:${top};stroke:${line};stroke-width:1.2;stroke-linejoin:round"/>`;
  return s + extra;
}

/** A flat shape lying on a vertical face that looks left (+y), e.g. a window or a stripe. */
function onLeftFace(yFace, xz, fill, extra = '') {
  return `<polygon points="${pts(xz.map(([x, z]) => P(x, yFace, z)))}" style="fill:${fill}" ${extra}/>`;
}
/** Same, on a face that looks right (+x). */
function onRightFace(xFace, yz, fill, extra = '') {
  return `<polygon points="${pts(yz.map(([y, z]) => P(xFace, y, z)))}" style="fill:${fill}" ${extra}/>`;
}
/** A wheel: a circle standing on a left-looking face. */
function wheel(cx, yFace, cz, rad) {
  const ring = (rr) => Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return P(cx + rr * Math.cos(a), yFace, cz + rr * Math.sin(a)); });
  return `<polygon points="${pts(ring(rad))}" style="fill:var(--sc-ink);stroke:var(--sc-line);stroke-width:1.2"/>` +
    `<polygon points="${pts(ring(rad * 0.42))}" style="fill:var(--sc-top)"/>`;
}
/** Text written on a left-looking face, as if printed on it. */
function textOnLeft(x, yFace, z, body, cls) {
  const [tx, ty] = P(x, yFace, z);
  return `<text class="${cls}" transform="matrix(${f(COS)} ${f(SIN)} 0 1 ${f(tx)} ${f(ty)})">${body}</text>`;
}

const SAREE = ['var(--sc-silk-1)', 'var(--sc-silk-2)', 'var(--sc-silk-3)'];

/** A folded saree: a flat stack with its fold line on top and its zari border on the front. */
function saree(x, y, z, colour, layers = 1) {
  let s = '';
  for (let k = 0; k < layers; k++) {
    const zz = z + k * 9;
    s += solid({ x, y, z: zz, w: 30, d: 44, h: 8, r: 3, top: colour, left: colour, right: colour, line: 'var(--sc-line-soft)' });
    s += onLeftFace(y + 44, [[x + 2, zz + 2.2], [x + 28, zz + 2.2], [x + 28, zz + 3.6], [x + 2, zz + 3.6]], 'var(--sc-zari)');
  }
  const top = z + layers * 9 - 1;
  s += `<line x1="${f(P(x + 15, y + 3, top)[0])}" y1="${f(P(x + 15, y + 3, top)[1])}" x2="${f(P(x + 15, y + 41, top)[0])}" y2="${f(P(x + 15, y + 41, top)[1])}" style="stroke:var(--sc-fold);stroke-width:1;stroke-linecap:round"/>`;
  return s;
}

export function buildScene() {
  const TILE_H = 22;
  const T = TILE_H;
  let s = `<defs><filter id="sc-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>`;

  // Bases: truck back-left, rack front-centre, board back-right.
  const base = (x, y, w, d) => solid({ x, y, w, d, h: TILE_H, r: 18, top: 'var(--sc-top)', left: 'var(--sc-left)', right: 'var(--sc-right)', shadow: true });
  s += base(-60, 150, 150, 140);
  s += base(170, 210, 180, 170);
  s += base(200, -40, 150, 140);

  // ── The supplier's truck ──────────────────────────────────────────────────────────
  let truck = '';
  truck += solid({ x: -48, y: 186, z: T + 9, w: 92, d: 62, h: 52, r: 5, top: 'var(--sc-top)', left: 'var(--sc-left)', right: 'var(--sc-right)' });
  truck += onLeftFace(248, [[-38, T + 24], [34, T + 24], [34, T + 30], [-38, T + 30]], 'var(--sc-brand)');
  truck += textOnLeft(-36, 248, T + 44, 'SUPPLIER', 'sc-print');
  truck += solid({ x: 48, y: 192, z: T + 9, w: 32, d: 52, h: 38, r: 6, top: 'var(--sc-brand-deep)', left: 'var(--sc-brand-deep-l)', right: 'var(--sc-brand-deep-r)' });
  truck += onRightFace(80, [[198, T + 30], [238, T + 30], [238, T + 42], [198, T + 42]], 'var(--sc-glass)');
  truck += onLeftFace(244, [[54, T + 30], [72, T + 30], [72, T + 42], [54, T + 42]], 'var(--sc-glass)');
  truck += wheel(-24, 248, T + 9, 9) + wheel(22, 248, T + 9, 9) + wheel(64, 244, T + 9, 9);
  s += `<g class="sc-truck">${truck}</g>`;

  // ── The rack, with sarees on its shelves ─────────────────────────────────────────
  let rack = '';
  const RX0 = 196, RX1 = 318, RY = 240, RD = 48;
  rack += solid({ x: RX0, y: RY, z: T, w: 7, d: RD, h: 114, r: 2, top: 'var(--sc-wood)', left: 'var(--sc-wood-l)', right: 'var(--sc-wood-r)' });
  const shelfZ = [T + 2, T + 38, T + 74, T + 110];
  const shelf = (zz) => solid({ x: RX0, y: RY, z: zz, w: RX1 - RX0, d: RD, h: 4, r: 2, top: 'var(--sc-wood)', left: 'var(--sc-wood-l)', right: 'var(--sc-wood-r)' });
  // Painted level by level, bottom to top: a shelf, then what sits on it, so each shelf hides the tops
  // of the stacks under it and never the other way round.
  rack += shelf(shelfZ[0]);
  rack += saree(RX0 + 10, RY + 4, shelfZ[0] + 4, SAREE[0], 2) + saree(RX0 + 46, RY + 4, shelfZ[0] + 4, SAREE[1], 3) + saree(RX0 + 82, RY + 4, shelfZ[0] + 4, SAREE[2], 2);
  rack += shelf(shelfZ[1]);
  rack += saree(RX0 + 10, RY + 4, shelfZ[1] + 4, SAREE[2], 3) + saree(RX0 + 46, RY + 4, shelfZ[1] + 4, SAREE[0], 2);
  // The new arrival fills the gap at the right of the middle shelf (CSS brings it in).
  rack += `<g class="sc-new">${saree(RX0 + 82, RY + 4, shelfZ[1] + 4, SAREE[1], 3)}</g>`;
  rack += shelf(shelfZ[2]);
  rack += saree(RX0 + 10, RY + 4, shelfZ[2] + 4, SAREE[1], 2);
  // The colour that runs low: one piece left.
  rack += `<g class="sc-low">${saree(RX0 + 46, RY + 4, shelfZ[2] + 4, SAREE[0], 1)}</g>`;
  rack += shelf(shelfZ[3]);
  s += `<g class="sc-rack">${rack}</g>`;
  // The front upright last, so it stands in front of the shelves' ends.
  s += solid({ x: RX1 - 7, y: RY, z: T, w: 7, d: RD, h: 114, r: 2, top: 'var(--sc-wood)', left: 'var(--sc-wood-l)', right: 'var(--sc-wood-r)' });

  // ── The stock board ──────────────────────────────────────────────────────────────
  let board = '';
  board += solid({ x: 232, y: 30, z: T, w: 60, d: 22, h: 6, r: 6, top: 'var(--sc-brand-deep)', left: 'var(--sc-brand-deep-l)', right: 'var(--sc-brand-deep-r)' });
  board += solid({ x: 258, y: 36, z: T + 6, w: 8, d: 8, h: 26, r: 2, top: 'var(--sc-brand-deep)', left: 'var(--sc-brand-deep-l)', right: 'var(--sc-brand-deep-r)' });
  board += solid({ x: 214, y: 34, z: T + 30, w: 104, d: 8, h: 84, r: 6, top: 'var(--sc-brand-deep)', left: 'var(--sc-brand-deep-l)', right: 'var(--sc-brand-deep-r)' });
  // Screen on its front (left-looking) face.
  board += onLeftFace(42, [[222, T + 38], [310, T + 38], [310, T + 106], [222, T + 106]], 'var(--sc-screen)');
  const bars = [[230, 22], [248, 34], [266, 16], [284, 28]];
  bars.forEach(([bx, bh], i) => {
    const cls = i === 1 ? 'sc-bar-grow' : i === 2 ? 'sc-bar-low' : '';
    board += `<g class="${cls}">${onLeftFace(42, [[bx, T + 44], [bx + 12, T + 44], [bx + 12, T + 44 + bh], [bx, T + 44 + bh]], i === 2 ? 'var(--sc-warn)' : 'var(--sc-lime)')}</g>`;
  });
  board += `<g class="sc-count-a">${textOnLeft(224, 42, T + 92, '36 in hand', 'sc-count')}</g>`;
  board += `<g class="sc-count-b">${textOnLeft(224, 42, T + 92, '48 in hand', 'sc-count')}</g>`;
  s += `<g class="sc-board">${board}</g>`;

  // ── Moving pieces ────────────────────────────────────────────────────────────────
  // The crate starts at the truck's open back and is carried to the rack (CSS moves it).
  s += `<g class="sc-crate">${solid({ x: 54, y: 166, z: T, w: 22, d: 22, h: 18, r: 3, top: 'var(--sc-lime)', left: 'var(--sc-lime-l)', right: 'var(--sc-lime-r)' })}` +
    `<line x1="${f(P(65, 166, T + 18)[0])}" y1="${f(P(65, 166, T + 18)[1])}" x2="${f(P(65, 188, T + 18)[0])}" y2="${f(P(65, 188, T + 18)[1])}" style="stroke:var(--sc-line-soft);stroke-width:1"/></g>`;
  // The low-stock tag above the board.
  const tag = P(266, 34, T + 114); // the top middle of the board
  // Just above the board, centred on it, clear of the count printed on the screen.
  s += `<g class="sc-tag"><rect x="${f(tag[0] - 52)}" y="${f(tag[1] - 40)}" width="104" height="26" rx="13" style="fill:var(--sc-warn);stroke:var(--sc-line);stroke-width:1.2"/>` +
    `<text class="sc-tagtext" x="${f(tag[0])}" y="${f(tag[1] - 22.5)}" text-anchor="middle">Reorder sent</text></g>`;

  return s;
}

/** Where the crate travels from (truck) to (rack), in page units, for the CSS that moves it. */
export const CRATE_TRAVEL = (() => {
  const a = P(54, 166, 22), b = P(196 + 82, 240 + 4, 22 + 38 + 4);
  return { dx: f(b[0] - a[0]), dy: f(b[1] - a[1]) };
})();

export const VIEWBOX = '-12 44 626 436';
