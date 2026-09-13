import { formatINRExact } from './formatUtils';

/**
 * An offer, said in one sentence a shop owner would say out loud.
 *
 * One function for the editor (while typing), the list and the offer page, so the three can never
 * describe the same offer differently. It takes plain values rather than a stored offer, because
 * the editor has to describe what is being typed before it exists.
 */

export const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'Everything' },
  { value: 'DRESS_TYPE', label: 'Types of garment' },
  { value: 'CATEGORY', label: 'Departments' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'VARIANT', label: 'Particular items (SKU)' }
];

export const DEPARTMENT_LABEL = { WOMEN: 'Women', MEN: 'Men', KIDS: 'Kids', UNISEX: 'Unisex' };
export const CHANNEL_LABEL = { POS: 'the till', ONLINE: 'the online store' };

const joinOr = (items, word = 'or', max = 3) => {
  if (items.length === 0) return '';
  const shown = items.length > max ? [...items.slice(0, max), `${items.length - max} more`] : items;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(', ')} ${word} ${shown[shown.length - 1]}`;
};

const money = (v) => formatINRExact(Number(v));

export function valuePhrase({ valueType, value, maxDiscount, level, perPiece }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (valueType === 'PERCENTAGE') return `${n}% off${maxDiscount ? ` (up to ${money(maxDiscount)})` : ''}`;
  if (valueType === 'FIXED_AMOUNT') return `${money(n)} off${level !== 'ORDER' ? (perPiece ? ' each piece of' : ' each line of') : ''}`;
  return `${money(n)} each`;
}

/** "every Saree or Lehenga", "Women's and Kids' wear", "3 products" -- what it lands on. */
export function targetPhrase({ level, scope, targetLabels = [], targetCount }) {
  if (level === 'ORDER') return 'the whole bill';
  const n = targetCount ?? targetLabels.length;
  // A list row holds product ids, not names: count them rather than print an id.
  if (scope === 'PRODUCT' && targetLabels.length < n) return `${n} product${n === 1 ? '' : 's'}`;
  switch (scope) {
    case 'DRESS_TYPE': return n ? `every ${joinOr(targetLabels)}` : 'the garment types you choose';
    case 'CATEGORY': return n ? `${joinOr(targetLabels, 'and')} departments` : 'the departments you choose';
    case 'PRODUCT': return n ? (n <= 2 ? joinOr(targetLabels, 'and') : `${n} products`) : 'the products you choose';
    case 'VARIANT': return n ? `${n} particular item${n === 1 ? '' : 's'}` : 'the items you choose';
    default: return 'everything';
  }
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clock = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
};

/** "Mon–Fri, 4 pm–7 pm". The same words the server's history uses. */
export function schedulePhrase(schedule) {
  if (!schedule?.from || !schedule?.to) return null;
  const days = [...(schedule.days ?? [])].sort((a, b) => a - b);
  let dayText = 'every day';
  if (days.join() === '1,2,3,4,5') dayText = 'Mon–Fri';
  else if (days.join() === '0,6') dayText = 'weekends';
  else if (days.length && days.length < 7) dayText = days.map(d => DAY_SHORT[d]).join(', ');
  return `${dayText}, ${clock(schedule.from)}–${clock(schedule.to)}`;
}

const dateText = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The whole sentence, and the bits that qualify it, separately -- so the page can show the sentence
 * large and the conditions as a quieter line underneath instead of one breathless paragraph.
 */
export function describeOffer(o) {
  // "₹200 off each piece of everything" says nothing "₹200 off every piece" does not.
  const allPieces = o.valueType === 'FIXED_AMOUNT' && o.level !== 'ORDER' && (o.scope ?? 'ALL') === 'ALL';
  const value = allPieces ? `${money(o.value)} off every ${o.perPiece ? 'piece' : 'line'}` : valuePhrase(o);
  const on = allPieces ? '' : targetPhrase(o);
  const headline = value
    ? (o.valueType === 'FIXED_PRICE' ? `${on[0]?.toUpperCase()}${on.slice(1)} at ${money(o.value)} each` : `${value[0].toUpperCase()}${value.slice(1)}${o.level === 'ORDER' ? ' the whole bill' : on ? ` ${on}` : ''}`)
    : null;

  const conditions = [];
  if (o.exclusionLabels?.length && o.exclusionLabels.length === (o.exclusionCount ?? o.exclusionLabels.length)) conditions.push(`except ${joinOr(o.exclusionLabels, 'and')}`);
  else if (o.exclusionCount) conditions.push(`except ${o.exclusionCount} item${o.exclusionCount === 1 ? '' : 's'}`);
  if (o.customerTags?.length) conditions.push(`for ${joinOr(o.customerTags)} customers`);
  if (o.trigger === 'CODE') {
    conditions.push(o.uniqueCodes ? 'with a single-use code' : o.couponCode ? `with the code ${String(o.couponCode).toUpperCase()}` : 'with a code');
  }
  if (Number(o.minSubtotal) > 0) conditions.push(`when ${o.level === 'ORDER' || o.scope === 'ALL' ? 'the bill' : 'those items'} come${o.level === 'ORDER' || o.scope === 'ALL' ? 's' : ''} to ${money(o.minSubtotal)} or more`);
  if (o.minQuantity) conditions.push(`when there are ${o.minQuantity} or more ${o.level === 'ORDER' || o.scope === 'ALL' ? 'items' : 'of them'}`);

  const where = [];
  const channels = (o.channels ?? []).filter(c => CHANNEL_LABEL[c]);
  if (channels.length === 1) where.push(`at ${CHANNEL_LABEL[channels[0]]} only`);
  if (o.locationNames?.length) where.push(`in ${joinOr(o.locationNames)}`);
  else if (o.locationIds?.length) where.push(`at ${o.locationIds.length} location${o.locationIds.length === 1 ? '' : 's'} only`);

  const limits = [];
  if (o.usageLimitPerCustomer) limits.push(o.usageLimitPerCustomer === 1 || o.usageLimitPerCustomer === '1' ? 'once per customer' : `${o.usageLimitPerCustomer} times per customer`);
  if (o.usageLimit) limits.push(`first ${o.usageLimit} uses`);

  const hours = schedulePhrase(o.schedule);
  if (hours) where.push(hours);

  let when = '';
  if (o.startsAt) {
    const starts = new Date(o.startsAt);
    const startPart = starts > new Date() ? `from ${dateText(starts)}` : '';
    const endPart = o.endsAt ? `until ${dateText(new Date(new Date(o.endsAt).getTime() - 1000))}` : '';
    when = [startPart, endPart].filter(Boolean).join(' ');
  }

  const qualifiers = [...conditions, ...where, ...limits, when].filter(Boolean);
  return {
    headline,
    qualifiers,
    sentence: headline ? `${headline}${qualifiers.length ? `, ${qualifiers.join(', ')}` : ''}.` : null
  };
}

/** A stored offer (list row or detail) turned into describeOffer's inputs. */
export function offerSummaryInput(offer, extras = {}) {
  const targetLabels = (offer.targets ?? []).map(t =>
    t.label ?? (t.scope === 'CATEGORY' ? (DEPARTMENT_LABEL[t.refId] ?? t.refId) : t.scope === 'DRESS_TYPE' ? t.refId : null)
  ).filter(Boolean);
  return {
    ...offer,
    targetLabels,
    targetCount: (offer.targets ?? []).length,
    exclusionLabels: (offer.exclusions ?? []).map(t => t.label ?? (t.scope === 'CATEGORY' ? (DEPARTMENT_LABEL[t.refId] ?? t.refId) : t.scope === 'DRESS_TYPE' ? t.refId : null)).filter(Boolean),
    exclusionCount: (offer.exclusions ?? []).length,
    locationNames: extras.locationNames ?? (offer.locations ?? []).map(l => l.name),
    ...extras
  };
}
