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

function extractPhoneCandidate(text) {
  const digits = normalizePhoneDigits(text);
  if (digits.length === 10) return digits;
  if (digits.length > 10 && digits.length <= 12) return normalizePhoneDigits(digits);
  return null;
}

module.exports = { normalizePhoneDigits, extractPhoneCandidate };
