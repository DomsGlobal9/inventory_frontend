/**
 * Click-to-chat helpers for sending a purchase order to a supplier over WhatsApp.
 *
 * This is the link-based approach on purpose: wa.me opens WhatsApp with the message
 * pre-filled and the user presses Send themselves. It needs no Meta business account, no
 * approved templates and no per-message cost, so it works the day it ships. The trade is
 * that nothing can be attached (text only) and there is no delivery confirmation -- both
 * of those need the Cloud API, which is a later phase.
 */

/**
 * Converts whatever someone typed into a supplier's phone field into the digits-only,
 * country-coded form wa.me requires.
 *
 * Supplier.phone is free text and always has been, so the stored values are a mix of
 * "98765 43210", "+91 98765 43210", "044-2345678" and blanks. wa.me accepts none of those:
 * it wants digits with a country code and nothing else.
 *
 * The 10-digit case is assumed to be India (+91). That assumption is safe for this app's
 * users today and is the only way a plain local number can be dialled at all, but it is an
 * assumption -- a supplier abroad must have their country code stored explicitly, which is
 * why an already-prefixed number is passed through untouched.
 *
 * @returns {string|null} digits ready for wa.me, or null when the input cannot be a number
 */
export function toWhatsAppNumber(raw) {
  if (!raw) return null;

  const trimmed = String(raw).trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;

  // Explicit country code -- take it at its word rather than guessing.
  if (hadPlus) return digits.length >= 8 ? digits : null;

  // Local Indian mobile, the common case.
  if (digits.length === 10) return `91${digits}`;

  // Written with a trunk prefix, e.g. 09876543210.
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;

  // Already carries a country code (91XXXXXXXXXX and similar).
  if (digits.length >= 11 && digits.length <= 15) return digits;

  // Too short to dial -- an extension, a partial entry, or junk.
  return null;
}

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// A wa.me URL carries the whole message as a query parameter, and both browsers and
// WhatsApp itself will silently truncate an over-long one. A supplier needs to recognise
// the order, not read the full line list -- the PDF is the record -- so long orders are
// summarised rather than risking a message that arrives cut in half.
const MAX_ITEM_LINES = 15;

/**
 * Builds the message body. Deliberately plain text: WhatsApp's own formatting is limited to
 * *bold* and _italics_, and anything fancier arrives as literal asterisks.
 */
export function buildPurchaseOrderMessage({ poNumber, supplierName, items = [], total, expectedDeliveryDate, senderName }) {
  const lines = [];

  lines.push(`Hello${supplierName ? ` ${supplierName}` : ''},`);
  lines.push('');
  lines.push(`Please find our purchase order *${poNumber}*.`);
  lines.push('');

  const shown = items.slice(0, MAX_ITEM_LINES);
  shown.forEach((item, index) => {
    const label = item.sku || item.productTitle || 'Item';
    const qty = item.orderedQty ?? 0;
    const price = formatCurrency(item.unitPrice);
    lines.push(`${index + 1}. ${label} — ${qty} x ${price}`);
  });

  if (items.length > shown.length) {
    lines.push(`...and ${items.length - shown.length} more item(s) — see the attached PDF.`);
  }

  lines.push('');
  lines.push(`Total: ${formatCurrency(total)}`);

  const due = formatDate(expectedDeliveryDate);
  if (due) lines.push(`Expected delivery: ${due}`);

  lines.push('');
  lines.push('Please confirm receipt of this order.');
  if (senderName) {
    lines.push('');
    lines.push(senderName);
  }

  return lines.join('\n');
}

/**
 * Returns the wa.me URL for a chat, or null when the number is unusable.
 *
 * api.whatsapp.com and wa.me both work; wa.me is used because it is the short form Meta
 * documents for click-to-chat and it resolves correctly to the desktop app, WhatsApp Web
 * and the mobile app without the caller having to detect which.
 */
export function buildWhatsAppUrl(phone, message) {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
