function formatBookedOn(date) {
  if (!date) return '';
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return String(date);
  }
}

module.exports = { formatBookedOn };
