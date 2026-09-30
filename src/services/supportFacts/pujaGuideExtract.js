/** Same extraction rules as admin pujaDosDontsMessage.helper (support-safe fields only). */

const DOS_HEADING_TEXT =
  /^(?:top\s+)?dos$|^what to do$|^recommended practices?$/;

const coercePujaGuidelines = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const extractGuidelineSectionItems = (pujaGuidelines, sectionKeys) => {
  const sections = coercePujaGuidelines(pujaGuidelines)?.sections;
  if (!Array.isArray(sections)) return '';

  const keys = [...sectionKeys];
  const items = [];
  for (const section of sections) {
    const key = String(section?.key || '').toLowerCase();
    const title = String(section?.title || '').toLowerCase();
    const matches = keys.some(
      (k) => key.includes(k) || title.includes(k.replace(/_/g, ' ')),
    );
    if (!matches) continue;
    for (const item of section.items || []) {
      const trimmed = String(item || '').trim();
      if (trimmed) items.push(trimmed);
    }
  }
  return items.join('\n');
};

const isDosHeadingLine = (line) => {
  const text = String(line || '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D✅❌✓✔☑]/g, '')
    .trim()
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .toLowerCase()
    .replace(/['\u2018\u2019]/g, '');

  return DOS_HEADING_TEXT.test(text);
};

const practiceLines = (text) => {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item && !isDosHeadingLine(item));
};

const firstPracticeLine = (text) => practiceLines(text)[0] || '';
const practicesText = (text) => practiceLines(text).join('\n');

function extractRecommendedPracticesText({ dos, pujaGuidelines } = {}) {
  const fromGuidelines = practicesText(
    extractGuidelineSectionItems(pujaGuidelines, ['recommended_practices']),
  );
  if (fromGuidelines) return fromGuidelines;
  return practicesText(dos);
}

function extractMantraText(pujaGuidelines) {
  return firstPracticeLine(
    extractGuidelineSectionItems(pujaGuidelines, ['recommended_mantras', 'mantra']),
  );
}

module.exports = { extractMantraText, extractRecommendedPracticesText };
