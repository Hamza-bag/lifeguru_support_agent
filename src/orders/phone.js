/**
 * Calling codes other than India. India stays on the existing 10-digit path.
 * Longest prefix wins so 971 is not read as 9.
 */
const INTL_DIAL_CODES = [
  '971', '966', '974', '965', '968', '973', '972', '880', '977', '94', '92',
  '86', '84', '82', '81', '66', '65', '64', '63', '62', '61', '60', '58', '57',
  '56', '55', '54', '53', '52', '51', '49', '48', '47', '46', '45', '44', '43',
  '41', '40', '39', '36', '34', '33', '32', '31', '30', '27', '20', '7', '1',
].sort((a, b) => b.length - a.length);

/** Same 91 / leading-0 strip as admin order listing. */
function normalizePhoneDigits(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

/**
 * WhatsApp sends dial code + local number. Accounts store the local number
 * in phone and the dial code in country_code. 10-digit Indian values return
 * null so that lookup stays the existing phone IN (...) query.
 */
function internationalPhonePair(digits) {
  const value = String(digits || '');
  if (value.length <= 10) return null;
  const dial = INTL_DIAL_CODES.find((code) => value.startsWith(code));
  if (!dial) return null;
  const national = value.slice(dial.length);
  if (dial === '1' && national.length !== 10) return null;
  if (national.length < 6 || national.length > 12) return null;
  return { countryCode: dial, national };
}

function extractPhoneCandidate(text) {
  const digits = normalizePhoneDigits(text);
  if (digits.length === 10) return digits;
  if (digits.length > 10 && digits.length <= 12) return normalizePhoneDigits(digits);
  return null;
}

module.exports = { normalizePhoneDigits, extractPhoneCandidate, internationalPhonePair };
