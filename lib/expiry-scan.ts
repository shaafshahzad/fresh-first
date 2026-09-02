export type ExpiryCandidate = {
  isoDate: string;
  raw: string;
  confidence: "high" | "review";
};

const MONTHS: Record<string, number> = {
  JA: 0,
  JAN: 0,
  JANUARY: 0,
  FE: 1,
  FEB: 1,
  FEBRUARY: 1,
  MR: 2,
  MAR: 2,
  MARCH: 2,
  AL: 3,
  APR: 3,
  APRIL: 3,
  MA: 4,
  MAY: 4,
  JN: 5,
  JUN: 5,
  JUNE: 5,
  JL: 6,
  JUL: 6,
  JULY: 6,
  AU: 7,
  AUG: 7,
  AUGUST: 7,
  SE: 8,
  SEP: 8,
  SEPT: 8,
  SEPTEMBER: 8,
  OC: 9,
  OCT: 9,
  OCTOBER: 9,
  NO: 10,
  NOV: 10,
  NOVEMBER: 10,
  DE: 11,
  DEC: 11,
  DECEMBER: 11,
};

const CANADIAN_MONTH_CODES = "JA|FE|MR|AL|MA|JN|JL|AU|SE|(?:O|0)C|N(?:O|0)|DE";

const MONTH_PATTERN = Object.keys(MONTHS)
  .filter((month) => month.length >= 3)
  .sort((a, b) => b.length - a.length)
  .join("|");

function makeDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function iso(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function timeForIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return makeDate(year, month - 1, day)?.getTime() ?? 0;
}

function normalizeYear(value: string, now: Date) {
  const parsed = Number(value);
  if (value.length === 4) return parsed;

  const century = Math.floor(now.getFullYear() / 100) * 100;
  let year = century + parsed;
  if (year < now.getFullYear() - 1) year += 100;
  return year;
}

function normalizeOcrNumber(value: string) {
  return value.replace(/O/g, "0").replace(/[IL|]/g, "1");
}

function normalizeStampedYear(value: string, now: Date) {
  const normalized = normalizeOcrNumber(value);
  if (normalized.length === 4) return Number(normalized);
  if (normalized.length === 3 && normalized.startsWith("0")) {
    return 2000 + Number(normalized);
  }
  if (normalized.length === 2) return normalizeYear(normalized, now);
  if (normalized.length === 1) {
    let year = Math.floor(now.getFullYear() / 10) * 10 + Number(normalized);
    if (year < now.getFullYear() - 1) year += 10;
    return year;
  }
  return Number.NaN;
}

function inferredYear(month: number, day: number, now: Date) {
  const thisYear = makeDate(now.getFullYear(), month, day);
  if (!thisYear) return null;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return thisYear >= cutoff
    ? thisYear
    : makeDate(now.getFullYear() + 1, month, day);
}

function inUsefulRange(date: Date, now: Date) {
  const earliest = new Date(now);
  earliest.setDate(earliest.getDate() - 45);
  const latest = new Date(now);
  latest.setFullYear(latest.getFullYear() + 3);
  return date >= earliest && date <= latest;
}

export function extractExpiryCandidates(
  ocrText: string,
  now = new Date(),
): ExpiryCandidate[] {
  const text = ocrText.toUpperCase().replace(/\s+/g, " ");
  const numericText = text.replace(/O/g, "0").replace(/[IL|]/g, "1");
  const found = new Map<string, ExpiryCandidate>();

  function add(
    year: number,
    month: number,
    day: number,
    raw: string,
    confidence: ExpiryCandidate["confidence"],
  ) {
    const date = makeDate(year, month, day);
    if (!date || !inUsefulRange(date, now)) return;
    const isoDate = iso(date);
    const existing = found.get(isoDate);
    if (!existing || existing.confidence === "review") {
      found.set(isoDate, { isoDate, raw: raw.trim(), confidence });
    }
  }

  for (const match of numericText.matchAll(
    /\b(20\d{2})[\s./-](\d{1,2})[\s./-](\d{1,2})\b/g,
  )) {
    add(Number(match[1]), Number(match[2]) - 1, Number(match[3]), match[0], "high");
  }

  // Canadian best-before dates commonly use the bilingual YEAR-MONTH-DAY
  // symbols JA, FE, MR, AL, MA, JN, JL, AU, SE, OC, NO, and DE.
  const canadianStamp = new RegExp(
    `\\b([0-9OIL|]{1,4})[\\s./-]+(${CANADIAN_MONTH_CODES})[\\s./-]+([0-9OIL|]{1,2})\\b`,
    "g",
  );
  for (const match of text.matchAll(canadianStamp)) {
    const rawYear = match[1];
    const monthCode = match[2].replace(/0/g, "O");
    const day = Number(normalizeOcrNumber(match[3]));
    add(
      normalizeStampedYear(rawYear, now),
      MONTHS[monthCode],
      day,
      match[0],
      rawYear.length === 2 || rawYear.length === 4 ? "high" : "review",
    );
  }

  for (const match of numericText.matchAll(/\b(20\d{2})(\d{2})(\d{2})\b/g)) {
    add(Number(match[1]), Number(match[2]) - 1, Number(match[3]), match[0], "high");
  }

  for (const match of numericText.matchAll(
    /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}|20\d{2})\b/g,
  )) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = normalizeYear(match[3], now);
    if (first > 12) {
      add(year, second - 1, first, match[0], "high");
    } else if (second > 12) {
      add(year, first - 1, second, match[0], "high");
    } else {
      add(year, second - 1, first, match[0], "review");
    }
  }

  const monthFirst = new RegExp(
    `\\b(${MONTH_PATTERN})[\\s./-]*(\\d{1,2})(?:ST|ND|RD|TH)?(?:[\\s,./-]+(\\d{2}|20\\d{2}))?\\b`,
    "g",
  );
  for (const match of text.matchAll(monthFirst)) {
    const month = MONTHS[match[1]];
    const day = Number(match[2]);
    const date = match[3]
      ? makeDate(normalizeYear(match[3], now), month, day)
      : inferredYear(month, day, now);
    if (date) {
      add(
        date.getFullYear(),
        month,
        day,
        match[0],
        match[3] ? "high" : "review",
      );
    }
  }

  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:ST|ND|RD|TH)?[\\s./-]*(${MONTH_PATTERN})(?:[\\s,./-]+(\\d{2}|20\\d{2}))?\\b`,
    "g",
  );
  for (const match of text.matchAll(dayFirst)) {
    const day = Number(match[1]);
    const month = MONTHS[match[2]];
    const date = match[3]
      ? makeDate(normalizeYear(match[3], now), month, day)
      : inferredYear(month, day, now);
    if (date) {
      add(
        date.getFullYear(),
        month,
        day,
        match[0],
        match[3] ? "high" : "review",
      );
    }
  }

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return [...found.values()].sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "high" ? -1 : 1;
    const distanceA = Math.abs(timeForIso(a.isoDate) - today.getTime());
    const distanceB = Math.abs(timeForIso(b.isoDate) - today.getTime());
    return distanceA - distanceB;
  });
}
