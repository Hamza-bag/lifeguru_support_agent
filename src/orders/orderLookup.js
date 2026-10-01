/** Keys Gemini or the rules path can return. Each key has one lookup function. */
const ORDER_LOOKUP_KEYS = new Set([
  'recent',
  'latest',
  'first',
  'on_date',
  'between',
  'puja_on',
]);

const BOOKING = /\b(order|orders|booking|bookings|puja|pooja|chadhava)\b|ऑर्डर|बुकिंग|पूजा/i;

function validIsoDate(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function collectDates(text) {
  const found = [];
  const source = String(text || '');
  for (const match of source.matchAll(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g)) {
    const iso = validIsoDate(`${match[1]}-${match[2]}-${match[3]}`);
    if (iso) found.push(iso);
  }
  for (const match of source.matchAll(
    /\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20\d{2})\b/g,
  )) {
    const iso = validIsoDate(
      `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
    );
    if (iso) found.push(iso);
  }
  return found;
}

function mentionsBooking(text) {
  return BOOKING.test(String(text || ''));
}

function hasUnparsedDateWords(text) {
  return (
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
      text,
    ) ||
    /जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर/.test(
      text,
    ) ||
    /\b(between|date range)\b/i.test(text) ||
    /के बीच|से लेकर/.test(text)
  );
}

/**
 * Read a lookup key from the user text.
 * deferToModel: a date was mentioned in words Gemini should turn into YYYY-MM-DD.
 */
function parseOrderLookup(text) {
  const raw = String(text || '');
  if (!mentionsBooking(raw)) return null;
  const dates = collectDates(raw);
  if (dates.length >= 2) {
    const sorted = [...dates].sort();
    return { key: 'between', from: sorted[0], to: sorted[sorted.length - 1] };
  }
  if (dates.length === 1) {
    const pujaDate =
      /\b(puja|pooja)\b|पूजा/i.test(raw) &&
      !/\b(booked|ordered|order date|booking date)\b/i.test(raw);
    return { key: pujaDate ? 'puja_on' : 'on_date', date: dates[0] };
  }
  if (hasUnparsedDateWords(raw)) return { deferToModel: true };

  if (
    /\b(first|oldest|earliest)\b/i.test(raw) ||
    /pehla|pehli|pehala|sabse puran|पहली|पहला|सबसे पुरान/i.test(raw)
  ) {
    return { key: 'first' };
  }
  if (
    /\b(latest|newest|most recent|last)\b/i.test(raw) ||
    /sabse naya|abhi wali|आखिरी|अंतिम|हाल ही/i.test(raw)
  ) {
    return { key: 'latest' };
  }
  return null;
}

function orderLookupFromModel(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const key = String(parsed.orderLookup || '').trim();
  if (!ORDER_LOOKUP_KEYS.has(key) || key === 'recent') return null;
  if (key === 'on_date' || key === 'puja_on') {
    const date = validIsoDate(parsed.orderDate);
    if (!date) return null;
    return { key, date };
  }
  if (key === 'between') {
    let from = validIsoDate(parsed.orderDateFrom);
    let to = validIsoDate(parsed.orderDateTo);
    if (!from || !to) return null;
    if (from > to) [from, to] = [to, from];
    return { key, from, to };
  }
  return { key };
}

/** User wording wins for first/latest. Dates in words come from the model. */
function chooseOrderLookup(parsed, userText) {
  const fromText = parseOrderLookup(userText);
  if (fromText?.deferToModel) return orderLookupFromModel(parsed);
  if (fromText?.key) return fromText;
  return orderLookupFromModel(parsed);
}

module.exports = {
  ORDER_LOOKUP_KEYS,
  parseOrderLookup,
  orderLookupFromModel,
  chooseOrderLookup,
  validIsoDate,
};
