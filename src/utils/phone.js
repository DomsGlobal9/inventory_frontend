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

/**
 * What a phone box keeps as it is typed or pasted: digits, spaces and + - ( ) . only, and a + only at the
 * start. Digits stop at the longest a number can be: 12 for an Indian number (91 and the 10 digits,
 * with or without + or 00), 15 with + or 00 (the longest any country has). Letters and a 60-digit paste
 * never reach the box, so the checks above only ever have to explain a real mistake. Hindi, Telugu,
 * Tamil and Kannada digits from a phone keyboard become 0-9.
 */
const LOCAL_DIGIT_ZEROS = [0x0966, 0x0c66, 0x0be6, 0x0ce6];

export function typedPhone(raw) {
  const asciiDigits = String(raw ?? '').replace(/[०-९౦-౯௦-௯೦-೯]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code - LOCAL_DIGIT_ZEROS.find(zero => code >= zero && code <= zero + 9));
  });
  const kept = asciiDigits.replace(/[^\d +\-.()]/g, '');
  const indian = /^\s*(\+\s*91|0091)/.test(kept);
  const international = /^\s*(\+|00)/.test(kept);
  // A leading 00 is dialling, not part of the number, so it does not use up the allowance.
  const most = (/^\s*00/.test(kept) ? 2 : 0) + (international && !indian ? 15 : 12);
  let out = '';
  let digits = 0;
  for (const ch of kept) {
    // A full number takes nothing more, not even a dot or a space typed after it.
    if (digits === most) break;
    if (ch === '+') { if (out.trim() === '') out += ch; continue; }
    if (ch >= '0' && ch <= '9') digits += 1;
    out += ch;
  }
  return out.replace(/ {2,}/g, ' ').replace(/^ +/, '').slice(0, 20);
}

/** "+919848022338" -> "+91 98480 22338"; other countries and anything unrecognised as stored. */
export function formatPhone(stored) {
  if (!stored) return '';
  const m = /^\+91(\d{5})(\d{5})$/.exec(stored);
  return m ? `+91 ${m[1]} ${m[2]}` : stored;
}
