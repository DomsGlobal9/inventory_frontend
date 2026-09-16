/**
 * One way to write a phone number -- the same rule as backend/src/lib/phone.ts, so the form can say
 * what is wrong as it is typed instead of after pressing Save. The server still decides.
 *
 * Indian mobiles: 10 digits starting 6-9, with or without +91 / 91 / a leading 0, stored as
 * "+919848022338". Another country: + (or 00) and the country code, 8-15 digits.
 */

const INDIA_HINT = 'Enter a 10-digit mobile number, or + and the country code for a number from another country.';

function looksFake(national) {
  if (/^(\d)\1+$/.test(national)) return true;
  const ascending = '01234567890123456789';
  const descending = '98765432109876543210';
  return national.length >= 8 && (ascending.includes(national) || descending.includes(national));
}

/** { ok: true, value: '+919848022338' } or { ok: false, reason } */
export function normalisePhone(raw) {
  const typed = raw === null || raw === undefined ? '' : String(raw).trim();
  if (!typed) return { ok: false, reason: "Enter the customer's phone number." };

  const compact = typed.replace(/[\s\-.()]/g, '');
  if (!/^(\+|00)?\d+$/.test(compact)) return { ok: false, reason: 'A phone number can only have digits, spaces, + and -.' };

  const international = compact.startsWith('+') || compact.startsWith('00');
  const digits = compact.replace(/^\+|^00/, '');

  if (!international || digits.startsWith('91')) {
    let national = null;
    if (!international && digits.length === 10) national = digits;
    else if (!international && digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
    else if (digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);

    if (national === null) return { ok: false, reason: international ? 'An Indian number has 10 digits after +91.' : INDIA_HINT };
    if (!/^[6-9]/.test(national)) return { ok: false, reason: 'An Indian mobile number starts with 6, 7, 8 or 9.' };
    if (looksFake(national)) return { ok: false, reason: "That doesn't look like a real number." };
    return { ok: true, value: `+91${national}` };
  }

  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) {
    return { ok: false, reason: 'A number from another country is + then the country code and number, 8 to 15 digits.' };
  }
  if (looksFake(digits.slice(-10))) return { ok: false, reason: "That doesn't look like a real number." };
  return { ok: true, value: `+${digits}` };
}

/** "+919848022338" -> "+91 98480 22338"; other countries and anything unrecognised as stored. */
export function formatPhone(stored) {
  if (!stored) return '';
  const m = /^\+91(\d{5})(\d{5})$/.exec(stored);
  return m ? `+91 ${m[1]} ${m[2]}` : stored;
}
