/**
 * A campaign's words as a customer will read them -- the same filling-in the server does
 * (services/campaigns/message.ts), so the preview on screen is the message that goes.
 */
export const PLACEHOLDERS = [
  { token: '{name}', label: 'First name' },
  { token: '{shop}', label: 'Shop name' },
  { token: '{points}', label: 'Their points' },
  { token: '{points_value}', label: 'Points worth ₹' }
];

export const MAX_TEXT = 1000;

const firstName = (full) => (full ?? '').trim().split(/\s+/)[0] || 'there';

export function renderCampaign(text, { name, shop, points = 0, pointsValue = '₹0' }) {
  const body = (text ?? '')
    .replace(/\{name\}/g, firstName(name))
    .replace(/\{shop\}/g, shop || 'your shop')
    .replace(/\{points\}/g, Math.max(0, points).toLocaleString('en-IN'))
    .replace(/\{points_value\}/g, pointsValue);
  return `${body}\n\n_${shop || 'your shop'}. Reply STOP to stop these messages._`;
}

/** Words for "who this reaches", the same as the server's describeAudience. */
export function describeAudience(a = {}) {
  if (a.customerIds) return `${a.customerIds.length} chosen customer${a.customerIds.length === 1 ? '' : 's'}`;
  const parts = [];
  if (a.tags?.length) parts.push(`in ${a.tags.join(' or ')}`);
  if (a.boughtWithinDays) parts.push(`bought in the last ${a.boughtWithinDays} days`);
  if (a.notBoughtForDays) parts.push(`nothing bought for ${a.notBoughtForDays} days`);
  if (a.minSpend) parts.push(`spent at least ₹${Number(a.minSpend).toLocaleString('en-IN')}`);
  if (a.minPoints) parts.push(`hold ${Number(a.minPoints).toLocaleString('en-IN')}+ points`);
  return parts.length ? `Customers who agreed to offers, ${parts.join(', ')}` : 'Every customer who agreed to offers';
}

/** "goes out today" / "takes about 3 days", for N messages at `perDay` a day. */
export function howLong(count, perDay) {
  if (!count || !perDay) return '';
  const days = Math.ceil(count / perDay);
  return days <= 1 ? 'goes out today' : `takes about ${days} days`;
}

/**
 * WhatsApp's own marks, *bold* and _italic_, shown the way the phone shows them, so the preview
 * does not print underscores the customer never sees.
 */
export function whatsappMarks(text) {
  const out = [];
  const re = /\*([^*\n]+)\*|_([^_\n]+)_/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? { b: m[1], k: i++ } : { i: m[2], k: i++ });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const STATUS_TONE = {
  DRAFT:     { bg: 'rgba(107,114,128,0.12)', fg: 'rgb(75,85,99)',   label: 'Draft' },
  SENDING:   { bg: 'rgba(34,197,94,0.12)',   fg: 'rgb(21,128,61)',  label: 'Sending' },
  PAUSED:    { bg: 'rgba(234,179,8,0.15)',   fg: 'rgb(161,98,7)',   label: 'Paused' },
  DONE:      { bg: 'rgba(59,130,246,0.12)',  fg: 'rgb(29,78,216)',  label: 'Finished' },
  CANCELLED: { bg: 'rgba(107,114,128,0.08)', fg: 'rgb(107,114,128)', label: 'Stopped' }
};

export const RECIPIENT_LABEL = {
  WAITING: 'Waiting its turn',
  HANDING: 'Sending',
  QUEUED: 'With WhatsApp',
  SENDING: 'Sending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Not sent',
  EXPIRED: 'Not sent',
  SKIPPED: 'Skipped'
};

export const SOURCE_LABEL = {
  BIRTHDAY: 'Birthday wishes',
  ANNIVERSARY: 'Anniversary wishes',
  POINTS_EXPIRING: 'Points lapsing reminder'
};
