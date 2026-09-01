export type QuickItem = {
  name: string;
  expiresOn: string;
  source: string;
};

export type QuickParseError = {
  line: string;
  message: string;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function iso(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function atNoon(date: Date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
}

function addDays(now: Date, amount: number) {
  const result = atNoon(now);
  result.setDate(result.getDate() + amount);
  return result;
}

function makeDate(year: number, month: number, day: number) {
  const result = new Date(year, month, day, 12, 0, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result;
}

function inferYear(month: number, day: number, now: Date) {
  const today = atNoon(now);
  const thisYear = makeDate(today.getFullYear(), month, day);
  if (!thisYear) return null;
  if (thisYear >= today) return thisYear;
  return makeDate(today.getFullYear() + 1, month, day);
}

function cleanName(value: string) {
  return value
    .replace(/[\s,;:()\-–—]+$/g, "")
    .replace(/^[\s,;:()\-–—]+/g, "")
    .trim();
}

function finish(line: string, namePart: string, date: Date | null) {
  const name = cleanName(namePart);
  if (!name) return null;
  if (!date) return null;
  return { name, expiresOn: iso(date), source: line };
}

export function parseQuickLine(
  value: string,
  now = new Date(),
): QuickItem | null {
  const line = value.trim();
  if (!line) return null;
  let match: RegExpMatchArray | null;

  match = line.match(/^(.*?)[\s,;:()\-–—]+(today|tomorrow)\)?$/i);
  if (match) {
    return finish(line, match[1], addDays(now, match[2].toLowerCase() === "tomorrow" ? 1 : 0));
  }

  match = line.match(/^(.*?)[\s,;:()\-–—]+(?:in\s+)?(\d{1,3})\s+days?\)?$/i);
  if (match) return finish(line, match[1], addDays(now, Number(match[2])));

  match = line.match(/^(.*?)[\s,;:()\-–—]+\+(\d{1,3})(?:\s*days?)?\)?$/i);
  if (match) return finish(line, match[1], addDays(now, Number(match[2])));

  match = line.match(
    /^(.*?)[\s,;:()\-–—]+(?:(next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\)?$/i,
  );
  if (match) {
    const today = atNoon(now);
    const target = WEEKDAYS[match[3].toLowerCase()];
    let offset = (target - today.getDay() + 7) % 7;
    if (match[2] && offset === 0) offset = 7;
    return finish(line, match[1], addDays(today, offset));
  }

  match = line.match(/^(.*?)[\s,;:()\-–—]+(\d{4})[-/](\d{1,2})[-/](\d{1,2})\)?$/);
  if (match) {
    return finish(
      line,
      match[1],
      makeDate(Number(match[2]), Number(match[3]) - 1, Number(match[4])),
    );
  }

  match = line.match(
    /^(.*?)[\s,;:()\-–—]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\)?$/i,
  );
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    const day = Number(match[3]);
    const rawYear = match[4] ? Number(match[4]) : null;
    const year = rawYear !== null && rawYear < 100 ? 2000 + rawYear : rawYear;
    return finish(
      line,
      match[1],
      year === null ? inferYear(month, day, now) : makeDate(year, month, day),
    );
  }

  match = line.match(
    /^(.*?)[\s,;:()\-–—]+(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s+(\d{2,4}))?\)?$/i,
  );
  if (match) {
    const month = MONTHS[match[3].toLowerCase()];
    const day = Number(match[2]);
    const rawYear = match[4] ? Number(match[4]) : null;
    const year = rawYear !== null && rawYear < 100 ? 2000 + rawYear : rawYear;
    return finish(
      line,
      match[1],
      year === null ? inferYear(month, day, now) : makeDate(year, month, day),
    );
  }

  match = line.match(/^(.*?)[\s,;:()\-–—]+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\)?$/);
  if (match) {
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const rawYear = match[4] ? Number(match[4]) : null;
    const year = rawYear !== null && rawYear < 100 ? 2000 + rawYear : rawYear;
    return finish(
      line,
      match[1],
      year === null ? inferYear(month, day, now) : makeDate(year, month, day),
    );
  }

  return null;
}

export function parseQuickItems(value: string, now = new Date()) {
  const items: QuickItem[] = [];
  const errors: QuickParseError[] = [];
  const lines = value
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const item = parseQuickLine(line, now);
    if (item) {
      items.push(item);
    } else {
      errors.push({
        line,
        message: "Add a date such as tomorrow, Sep 4, Friday, or 2026-09-04.",
      });
    }
  }

  return { items, errors };
}
