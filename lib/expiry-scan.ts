export type ExpiryCandidate = {
  isoDate: string;
  raw: string;
  confidence: "high" | "review";
};

const MONTH_ALIASES: string[][] = [
  ["JA", "JAN", "JANUARY", "JANVIER", "JANV", "JANEIRO", "GEN", "GENNAIO", "JANUAR", "JANUARI", "STY", "STYCZEN", "OCAK", "ЯНВ", "ЯНВАРЬ", "ΙΑΝ", "ΙΑΝΟΥΑΡΙΟΣ", "ינואר", "يناير"],
  ["FE", "FEB", "FEBRUARY", "FEV", "FEVRIER", "FEBRERO", "FEVEREIRO", "FEBBRAIO", "FEBRUAR", "FEBRUARI", "LUT", "LUTY", "SUBAT", "ФЕВ", "ФЕВРАЛЬ", "ΦΕΒ", "ΦΕΒΡΟΥΑΡΙΟΣ", "פברואר", "فبراير"],
  ["MR", "MAR", "MARCH", "MARS", "MARZO", "MARCO", "MAERZ", "MARZ", "MAART", "MARET", "MARZEC", "MART", "МАР", "МАРТ", "ΜΑΡ", "ΜΑΡΤΙΟΣ", "מרץ", "مارس"],
  ["AL", "APR", "APRIL", "AVR", "AVRIL", "ABR", "ABRIL", "APRILE", "KWIEC", "KWIECIEN", "NISAN", "АПР", "АПРЕЛЬ", "ΑΠΡ", "ΑΠΡΙΛΙΟΣ", "אפריל", "ابريل"],
  ["MA", "MAY", "MAI", "MAYO", "MAIO", "MAG", "MAGGIO", "MEI", "MAJ", "MAYIS", "МАЙ", "ΜΑΙ", "ΜΑΙΟΣ", "מאי", "مايو"],
  ["JN", "JUN", "JUNE", "JUIN", "JUNIO", "JUNHO", "GIU", "GIUGNO", "JUNI", "CZE", "CZERWIEC", "HAZIRAN", "ИЮН", "ИЮНЬ", "ΙΟΥΝ", "ΙΟΥΝΙΟΣ", "יוני", "يونيو"],
  ["JL", "JUL", "JULY", "JUIL", "JUILLET", "JULIO", "JULHO", "LUG", "LUGLIO", "JULI", "LIP", "LIPIEC", "TEMMUZ", "ИЮЛ", "ИЮЛЬ", "ΙΟΥΛ", "ΙΟΥΛΙΟΣ", "יולי", "يوليو"],
  ["AU", "AUG", "AUGUST", "AOUT", "AGO", "AGOSTO", "AUGUSTUS", "AUGUSTI", "SIE", "SIERPIEN", "AGUSTUS", "AGUSTOS", "АВГ", "АВГУСТ", "ΑΥΓ", "ΑΥΓΟΥΣΤΟΣ", "אוגוסט", "اغسطس"],
  ["SE", "5E", "SEP", "5EP", "SEPT", "SEPTEMBER", "SEPTEMBRE", "SEPTIEMBRE", "SET", "SETEMBRO", "SETTEMBRE", "WRZ", "WRZESIEN", "EYLUL", "СЕН", "СЕНТЯБРЬ", "ΣΕΠ", "ΣΕΠΤΕΜΒΡΙΟΣ", "ספטמבר", "سبتمبر"],
  ["OC", "0C", "OCT", "0CT", "OCTOBER", "OCTOBRE", "OCTUBRE", "OUT", "OUTUBRO", "OTT", "OTTOBRE", "OKT", "OKTOBER", "PAZ", "PAZDZIERNIK", "EKIM", "ОКТ", "ОКТЯБРЬ", "ΟΚΤ", "ΟΚΤΩΒΡΙΟΣ", "אוקטובר", "اكتوبر"],
  ["NO", "N0", "NOV", "N0V", "NOVEMBER", "NOVEMBRE", "NOVIEMBRE", "NOVEMBRO", "LISTOPAD", "KASIM", "НОЯ", "НОЯБРЬ", "ΝΟΕ", "ΝΟΕΜΒΡΙΟΣ", "נובמבר", "نوفمبر"],
  ["DE", "DEC", "DECEMBER", "DECEMBRE", "DIC", "DICIEMBRE", "DEZ", "DEZEMBRO", "DICEMBRE", "DEZEMBER", "DESEMBER", "GRU", "GRUDZIEN", "ARALIK", "ДЕК", "ДЕКАБРЬ", "ΔΕΚ", "ΔΕΚΕΜΒΡΙΟΣ", "דצמבר", "ديسمبر"],
];

const LOCALIZED_DIGITS = [
  "٠١٢٣٤٥٦٧٨٩",
  "۰۱۲۳۴۵۶۷۸۹",
  "०१२३४५६७८९",
  "০১২৩৪৫৬৭৮৯",
  "๐๑๒๓๔๕๖๗๘๙",
  "０１２３４５６７８９",
];

function normalizeDigits(value: string) {
  let normalized = value;
  for (const digits of LOCALIZED_DIGITS) {
    normalized = normalized.replace(
      new RegExp(`[${digits}]`, "g"),
      (digit) => String(digits.indexOf(digit)),
    );
  }
  return normalized;
}

function foldText(value: string) {
  return normalizeDigits(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[年月日년월일]/g, "-")
    .replace(/[٫٬،]/g, ".")
    .replace(/\s+/g, " ");
}

const MONTHS = new Map<string, number>();
for (let month = 0; month < MONTH_ALIASES.length; month += 1) {
  for (const alias of MONTH_ALIASES[month]) MONTHS.set(foldText(alias), month);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MONTH_PATTERN = [...MONTHS.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

const MONTH_TOKEN = `(?<![\\p{L}\\p{N}])(${MONTH_PATTERN})(?![\\p{L}\\p{N}])`;

function makeDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day, 12, 0, 0, 0);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
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

function normalizeOcrNumber(value: string) {
  return value.replace(/O/g, "0").replace(/[IL|]/g, "1");
}

function normalizeYear(value: string, now: Date) {
  const normalized = normalizeOcrNumber(value);
  const parsed = Number(normalized);
  if (normalized.length === 4) {
    return parsed >= 2400 && parsed <= 2800 ? parsed - 543 : parsed;
  }

  const century = Math.floor(now.getFullYear() / 100) * 100;
  let year = century + parsed;
  if (year < now.getFullYear() - 1) year += 100;
  return year;
}

function normalizeStampedYear(value: string, now: Date) {
  const normalized = normalizeOcrNumber(value);
  if (normalized.length === 4 || normalized.length === 2) {
    return normalizeYear(normalized, now);
  }
  if (normalized.length === 3 && normalized.startsWith("0")) {
    return 2000 + Number(normalized);
  }
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

function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0, 12, 0, 0, 0);
}

function dateFromOrdinal(year: number, ordinal: number) {
  if (ordinal < 1 || ordinal > (makeDate(year, 1, 29) ? 366 : 365)) return null;
  const date = new Date(year, 0, 1, 12, 0, 0, 0);
  date.setDate(ordinal);
  return date;
}

function dateFromIsoWeek(year: number, week: number, weekday = 7) {
  if (week < 1 || week > 53 || weekday < 1 || weekday > 7) return null;
  const januaryFourth = new Date(year, 0, 4, 12, 0, 0, 0);
  const mondayOffset = (januaryFourth.getDay() + 6) % 7;
  const date = new Date(januaryFourth);
  date.setDate(januaryFourth.getDate() - mondayOffset + (week - 1) * 7 + weekday - 1);
  return date.getFullYear() === year || week === 1 || week >= 52 ? date : null;
}

function inUsefulRange(date: Date, now: Date) {
  const earliest = new Date(now);
  earliest.setFullYear(earliest.getFullYear() - 1);
  const latest = new Date(now);
  latest.setFullYear(latest.getFullYear() + 10);
  return date >= earliest && date <= latest;
}

export function extractExpiryCandidates(
  ocrText: string,
  now = new Date(),
): ExpiryCandidate[] {
  const text = foldText(ocrText);
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
    if (!existing || (existing.confidence === "review" && confidence === "high")) {
      found.set(isoDate, { isoDate, raw: raw.trim(), confidence });
    }
  }

  function addDate(
    date: Date | null,
    raw: string,
    confidence: ExpiryCandidate["confidence"] = "review",
  ) {
    if (date) add(date.getFullYear(), date.getMonth(), date.getDate(), raw, confidence);
  }

  for (const match of numericText.matchAll(
    /(?<!\d)(\d{4})[\s./-]+(\d{1,2})[\s./-]+(\d{1,2})(?!\d)/g,
  )) {
    const year = normalizeYear(match[1], now);
    const second = Number(match[2]);
    const third = Number(match[3]);
    add(year, second - 1, third, match[0], "high");
    if (second <= 31 && third <= 12 && second !== third) {
      add(year, third - 1, second, match[0], "review");
    }
  }

  for (const match of numericText.matchAll(/(?<!\d)(\d{8})(?!\d)/g)) {
    const value = match[1];
    add(normalizeYear(value.slice(0, 4), now), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)), value, "high");
    const year = normalizeYear(value.slice(4), now);
    const first = Number(value.slice(0, 2));
    const second = Number(value.slice(2, 4));
    if (first > 12) add(year, second - 1, first, value, "high");
    else if (second > 12) add(year, first - 1, second, value, "high");
    else {
      add(year, second - 1, first, value, "review");
      if (first !== second) add(year, first - 1, second, value, "review");
    }
  }

  for (const match of numericText.matchAll(
    /(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?!\d)/g,
  )) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = normalizeYear(match[3], now);
    if (first > 12) add(year, second - 1, first, match[0], "high");
    else if (second > 12) add(year, first - 1, second, match[0], "high");
    else {
      add(year, second - 1, first, match[0], "review");
      if (first !== second) add(year, first - 1, second, match[0], "review");
    }
  }

  for (const match of numericText.matchAll(/(?<!\d)(\d{6})(?!\d)/g)) {
    const value = match[1];
    add(normalizeYear(value.slice(0, 2), now), Number(value.slice(2, 4)) - 1, Number(value.slice(4, 6)), value, "review");
    const year = normalizeYear(value.slice(4), now);
    const first = Number(value.slice(0, 2));
    const second = Number(value.slice(2, 4));
    if (first <= 31 && second <= 12) add(year, second - 1, first, value, "review");
    if (first <= 12 && second <= 31) add(year, first - 1, second, value, "review");
  }

  const yearMonthDay = new RegExp(
    `(?<![\\p{L}\\p{N}])([0-9OIL|]{1,4})[\\s./-]+${MONTH_TOKEN}[\\s./-]+([0-9OIL|]{1,2})(?![\\p{L}\\p{N}])`,
    "gu",
  );
  for (const match of text.matchAll(yearMonthDay)) {
    const rawYear = match[1];
    add(
      normalizeStampedYear(rawYear, now),
      MONTHS.get(match[2]) ?? -1,
      Number(normalizeOcrNumber(match[3])),
      match[0],
      rawYear.length === 2 || rawYear.length === 4 ? "high" : "review",
    );
  }

  const monthFirst = new RegExp(
    `${MONTH_TOKEN}[\\s./-]*(\\d{1,2})(?:ST|ND|RD|TH)?(?:[\\s,./-]+(\\d{2}|\\d{4}))?(?![\\p{L}\\p{N}])`,
    "gu",
  );
  for (const match of text.matchAll(monthFirst)) {
    if (match[1].length < 3 && !match[3]) continue;
    const month = MONTHS.get(match[1]) ?? -1;
    const day = Number(match[2]);
    const date = match[3]
      ? makeDate(normalizeYear(match[3], now), month, day)
      : inferredYear(month, day, now);
    addDate(date, match[0], match[3] && match[1].length >= 3 ? "high" : "review");
  }

  const dayFirst = new RegExp(
    `(?<![\\p{L}\\p{N}])(\\d{1,2})(?:ST|ND|RD|TH)?[\\s./-]*${MONTH_TOKEN}(?:[\\s,./-]+(\\d{2}|\\d{4}))?(?![\\p{L}\\p{N}])`,
    "gu",
  );
  for (const match of text.matchAll(dayFirst)) {
    if (match[2].length < 3 && !match[3]) continue;
    const day = Number(match[1]);
    const month = MONTHS.get(match[2]) ?? -1;
    const date = match[3]
      ? makeDate(normalizeYear(match[3], now), month, day)
      : inferredYear(month, day, now);
    addDate(date, match[0], match[3] && match[2].length >= 3 ? "high" : "review");
  }

  const romanMonths: Record<string, number> = {
    I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5,
    VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11,
  };
  for (const match of text.matchAll(
    /(?<![A-Z0-9])(\d{1,2})[./-](I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)[./-](\d{2}|\d{4})(?![A-Z0-9])/g,
  )) {
    add(normalizeYear(match[3], now), romanMonths[match[2]], Number(match[1]), match[0], "high");
  }

  for (const match of numericText.matchAll(
    /(?<!\d)(\d{4})[.-]?W(\d{1,2})(?:[.-]?([1-7]))?(?!\d)/g,
  )) {
    addDate(
      dateFromIsoWeek(normalizeYear(match[1], now), Number(match[2]), Number(match[3] ?? 7)),
      match[0],
    );
  }

  for (const match of numericText.matchAll(/(?<!\d)(\d{4})[.-]?(\d{3})(?!\d)/g)) {
    addDate(dateFromOrdinal(normalizeYear(match[1], now), Number(match[2])), match[0]);
  }

  const eraStarts: Record<string, number> = { R: 2018, H: 1988, S: 1925 };
  for (const match of numericText.matchAll(
    /(?<![A-Z0-9])(R|H|S)(\d{1,2})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/g,
  )) {
    add(eraStarts[match[1]] + Number(match[2]), Number(match[3]) - 1, Number(match[4]), match[0], "review");
  }

  for (const match of text.matchAll(/民國\s*(\d{1,3})[./-](\d{1,2})[./-](\d{1,2})/g)) {
    add(1911 + Number(match[1]), Number(match[2]) - 1, Number(match[3]), match[0], "review");
  }

  for (const match of numericText.matchAll(
    /(?<![\d./-])(\d{1,2})[./-](\d{4})(?![\d./-])/g,
  )) {
    const month = Number(match[1]) - 1;
    const year = normalizeYear(match[2], now);
    if (month >= 0 && month <= 11) addDate(endOfMonth(year, month), match[0]);
  }
  for (const match of numericText.matchAll(
    /(?<![\d./-])(\d{4})[./-](\d{1,2})(?![\d./-])/g,
  )) {
    const year = normalizeYear(match[1], now);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) addDate(endOfMonth(year, month), match[0]);
  }
  const namedMonthYear = new RegExp(
    `${MONTH_TOKEN}[\\s./-]+(\\d{4})(?![\\p{L}\\p{N}])`,
    "gu",
  );
  for (const match of text.matchAll(namedMonthYear)) {
    const month = MONTHS.get(match[1]) ?? -1;
    addDate(endOfMonth(normalizeYear(match[2], now), month), match[0]);
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
