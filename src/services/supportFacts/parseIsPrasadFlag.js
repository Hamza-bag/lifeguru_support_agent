/** order_user_details.is_prasad is varchar — typically Yes/No from checkout. */
function parseIsPrasadFlag(value) {
  if (value == null || value === '') return false;
  const s = String(value).trim().toLowerCase();
  if (s === 'no' || s === 'false' || s === '0' || s === 'n') return false;
  if (s === 'yes' || s === 'true' || s === '1' || s === 'y') return true;
  return false;
}

module.exports = { parseIsPrasadFlag };
