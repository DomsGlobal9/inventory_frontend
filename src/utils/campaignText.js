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
/** Offered only when the campaign has a link; the server refuses {link} without one. */
export const LINK_PLACEHOLDER = { token: '{link}', label: 'Link' };

export const MAX_TEXT = 1000;
/** WhatsApp's limit for the words under a picture. */
export const MAX_CAPTION = 1024;
/** What a short link looks like in the preview (each customer really gets their own). */
export const SAMPLE_LINK = 'go.scaleezy.com/x7Kq9Pm';

const firstName = (full) => (full ?? '').trim().split(/\s+/)[0] || 'there';

export function renderCampaign(text, { name, shop, points = 0, pointsValue = '₹0', link = SAMPLE_LINK }) {
  const body = (text ?? '')
    .replace(/\{name\}/g, firstName(name))
    .replace(/\{shop\}/g, shop || 'your shop')
    .replace(/\{points\}/g, Math.max(0, points).toLocaleString('en-IN'))
    .replace(/\{points_value\}/g, pointsValue)
    .replace(/\{link\}/g, link ?? '');
  return `${body}\n\n_${shop || 'your shop'}. Reply STOP to stop these messages._`;
}

/**
 * The longest the words can come out, counted the way the server counts it for the 1,024-letter
 * limit under a picture: a 20-letter first name, a big points balance, the full short address and
 * the STOP line.
 */
export function longestCaption(text, shop) {
  return renderCampaign(text, { name: 'x'.repeat(20), shop: shop || 'our shop', points: 9_999_999, pointsValue: '₹99,99,999', link: `https://${SAMPLE_LINK}` }).length;
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
  PREPARING: { bg: 'rgba(59,130,246,0.10)',  fg: 'rgb(29,78,216)',  label: 'Getting links ready' },
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

/** Why customers were not sent it, as the campaign page counts it. */
export const NOT_SENT_LABEL = {
  RECENT_OFFER: 'Had an offer from you in the last 3 days',
  OPTED_OUT: 'Replied STOP',
  NO_CONSENT: 'No longer agree to offers',
  NO_PHONE: 'No phone number',
  INACTIVE: 'Customer not active',
  DELETED: 'Customer deleted',
  CAMPAIGN_STOPPED: 'The campaign was stopped',
  NOT_ON_WHATSAPP: 'Number not on WhatsApp',
  MEDIA_FETCH_FAILED: 'The picture could not load',
  MEDIA_UNREADABLE: 'WhatsApp could not read the picture',
  ENGINE_GAVE_UP: 'WhatsApp failed three times',
  ENGINE_REJECTED: 'WhatsApp refused it',
  DELIVERY_FAILED: 'WhatsApp could not deliver it',
  EXPIRED: 'Not sent within a day',
  REFUSED: 'Refused',
  OTHER: 'Not sent'
};

export const SOURCE_LABEL = {
  BIRTHDAY: 'Birthday wishes',
  ANNIVERSARY: 'Anniversary wishes',
  POINTS_EXPIRING: 'Points lapsing reminder'
};
