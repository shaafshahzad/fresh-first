import { daysUntilCalendarDate } from "./calendar-date";

export type ExpiryTone = "expired" | "urgent" | "soon" | "warning" | "later";

export type ExpiryPresentation = {
  days: number | null;
  marker: string | null;
  timing: string;
  tone: ExpiryTone;
};

export function expiryPresentation(
  dateString: string,
  now = new Date(),
): ExpiryPresentation {
  const days = daysUntilCalendarDate(dateString, now);

  if (days === null) {
    return {
      days,
      marker: null,
      timing: "Expiry date unavailable",
      tone: "later",
    };
  }

  if (days < 0) {
    return {
      days,
      marker: "Expired",
      timing:
        days === -1
          ? "Expired yesterday"
          : `Expired ${Math.abs(days)} days ago`,
      tone: "expired",
    };
  }

  if (days <= 1) {
    return {
      days,
      marker: days === 0 ? "Use today" : "Use tomorrow",
      timing: days === 0 ? "Expires today" : "Expires tomorrow",
      tone: "urgent",
    };
  }

  if (days <= 3) {
    return {
      days,
      marker: "Really soon",
      timing: `Expires in ${days} days`,
      tone: "soon",
    };
  }

  if (days <= 5) {
    return {
      days,
      marker: "5-day warning",
      timing: `Expires in ${days} days`,
      tone: "warning",
    };
  }

  return {
    days,
    marker: null,
    timing: `Expires in ${days} days`,
    tone: "later",
  };
}
