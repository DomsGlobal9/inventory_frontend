/**
 * How a product is sold, for the screens (13 Nov 2026, PLAN-fabrics.md). Kept in step by hand with the backend's
 * src/lib/units.ts: the same codes, factors and rules.
 *
 * Stored: quantities in BASE units (a metre product keeps centimetres: 225 = 2.25 m) and prices PER BASE UNIT
 * (₹450 per metre is stored as 4.50 per cm), so every bill, tax and report sum stays exactly as it was.
 * Shown and typed: per metre ("₹450 / m", "2.25 m"). Pieces and packets: factor 1, nothing changes.
 */
export const UNITS = {
  PIECE:    { factor: 1,    whole: true,  one: 'piece',    many: 'pieces',    short: 'pc',  per: 'piece' },
  METRE:    { factor: 100,  whole: false, one: 'metre',    many: 'metres',    short: 'm',   per: 'm' },
  PACKET:   { factor: 1,    whole: true,  one: 'packet',   many: 'packets',   short: 'pkt', per: 'packet' },
  PAIR:     { factor: 1,    whole: true,  one: 'pair',     many: 'pairs',     short: 'pr',  per: 'pair' },
  SET:      { factor: 1,    whole: true,  one: 'set',      many: 'sets',      short: 'set', per: 'set' },
  KILOGRAM: { factor: 1000, whole: false, one: 'kilogram', many: 'kilograms', short: 'kg',  per: 'kg' },
  GRAM:     { factor: 1,    whole: true,  one: 'gram',     many: 'grams',     short: 'g',   per: 'g' },
  BOX:      { factor: 1,    whole: true,  one: 'box',      many: 'boxes',     short: 'box', per: 'box' },
  STRING:   { factor: 1,    whole: true,  one: 'string',   many: 'strings',   short: 'str', per: 'string' },
  UNIT:     { factor: 1,    whole: true,  one: 'unit',     many: 'units',     short: 'unit', per: 'unit' },
};

export const unitOf = (soldBy) => UNITS[soldBy] ?? UNITS.PIECE;
export const factorOf = (soldBy) => unitOf(soldBy).factor;
export const isMeasured = (soldBy) => !unitOf(soldBy).whole;
const digits = (soldBy) => Math.round(Math.log10(factorOf(soldBy)));

/** Typed "2.25" / "2,25" in the unit -> base units (225), or null when it cannot be held exactly. */
export function toBase(input, soldBy) {
  const text = String(input ?? '').trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  if ((text.split('.')[1] ?? '').length > digits(soldBy)) return null;
  const n = Math.round(Number(text) * factorOf(soldBy));
  return Number.isSafeInteger(n) ? n : null;
}

/** Base units -> the number shown in the unit (225 -> 2.25). */
export const fromBase = (base, soldBy) => Number(base) / factorOf(soldBy);

/** "2.25 m", "3 pieces", "1 packet". `short`: "3 pc". */
export function formatQty(base, soldBy, { short = false } = {}) {
  const u = unitOf(soldBy);
  const n = fromBase(base ?? 0, soldBy);
  const d = digits(soldBy);
  const shown = d ? n.toFixed(d) : String(n);
  if (short || !u.whole) return `${shown} ${u.short}`;
  return `${shown} ${n === 1 ? u.one : u.many}`;
}

/** The stored per-base price -> the price per unit people see (4.50 -> 450). */
export const pricePerUnit = (stored, soldBy) => Math.round(Number(stored ?? 0) * factorOf(soldBy) * 100) / 100;

/** A typed price per unit -> what is stored (450 per metre -> 4.50), or null when it cannot be stored exactly. */
export function storedPrice(perUnit, soldBy) {
  const n = Number(String(perUnit ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  const paise = (n * 100) / factorOf(soldBy);
  const whole = Math.round(paise);
  return Math.abs(paise - whole) > 1e-6 ? null : whole / 100;
}

/** Why a typed price per unit cannot be used, in plain words, or null. */
export function priceProblem(perUnit, soldBy) {
  if (storedPrice(perUnit, soldBy) !== null) return null;
  const n = Number(String(perUnit ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 'Enter a price of 0 or more.';
  return `A price per ${unitOf(soldBy).one} must be in whole rupees, like ${Math.round(n)}.`;
}

/** "₹450 / m" for a stored price; "₹1,200" for a piece. */
export function formatPrice(stored, soldBy) {
  const per = pricePerUnit(stored, soldBy);
  const money = `₹${per.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return soldBy && soldBy !== 'PIECE' ? `${money} / ${unitOf(soldBy).per}` : money;
}

/** The smallest sale in base units: the product's own cut, else the shop's (metre), else 1. */
export function minCutOf(product, shopMinCut = 25) {
  if (!isMeasured(product?.soldBy)) return 1;
  const own = Number(product?.minCut);
  if (Number.isInteger(own) && own > 0) return own;
  return product?.soldBy === 'METRE' ? shopMinCut : 1;
}

/** Why a base quantity cannot be SOLD, in plain words, or null. */
export function quantityProblem(base, product, shopMinCut = 25) {
  const u = unitOf(product?.soldBy);
  if (!Number.isSafeInteger(base)) return u.whole ? `Enter a whole number of ${u.many}.` : `Enter the length in ${u.many}, like 2.25.`;
  if (base <= 0) return `Enter more than 0 ${u.many}.`;
  const cut = minCutOf(product, shopMinCut);
  if (cut > 1 && base % cut !== 0) {
    const down = Math.floor(base / cut) * cut;
    return `${formatQty(base, product.soldBy)} is not a multiple of the smallest cut (${formatQty(cut, product.soldBy)}). Use ${down > 0 ? `${formatQty(down, product.soldBy)} or ` : ''}${formatQty(down + cut, product.soldBy)}.`;
  }
  return null;
}
