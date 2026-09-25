function formatWhen(iso, lang) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function formatOrderLine(order, index) {
  const booked = order.bookedOn || '';
  return `${index}. ${order.title}${booked ? ` — ${booked}` : ''}`;
}

function formatStatus(status, lang) {
  const key = String(status || '').toLowerCase();
  if (lang === 'hi') {
    const map = {
      initiated: 'शुरू',
      paid: 'पेड',
      scheduled: 'शेड्यूल्ड',
      performed: 'पूजा हो चुकी',
      delivered: 'डिलीवर्ड',
      cancelled: 'कैंसल',
    };
    return map[key] || status || '—';
  }
  return status || '—';
}

module.exports = { formatWhen, formatOrderLine, formatStatus };
