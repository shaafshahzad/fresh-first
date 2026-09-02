export function parseCalendarDate(value: string) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
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

export function daysUntilCalendarDate(value: string, now = new Date()) {
  const expiry = parseCalendarDate(value);
  if (!expiry) return null;

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function formatCalendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const date = parseCalendarDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-CA", options).format(date);
}
