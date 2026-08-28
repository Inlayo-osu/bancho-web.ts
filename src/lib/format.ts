const numberFormat = new Intl.NumberFormat("en-US");

export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

export function formatPerformance(pp: number): string {
  return `${formatNumber(pp)}pp`;
}

export function formatAccuracy(acc: number): string {
  return `${acc.toFixed(2)}%`;
}

/** Format a playtime using the largest useful calendar units. */
export function formatPlaytime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const minutesPerYear = 365 * 24 * 60;
  const minutesPerDay = 24 * 60;
  const minutesPerHour = 60;
  const years = Math.floor(totalMinutes / minutesPerYear);
  const days = Math.floor((totalMinutes % minutesPerYear) / minutesPerDay);
  const hours = Math.floor((totalMinutes % minutesPerDay) / minutesPerHour);
  const minutes = totalMinutes % minutesPerHour;

  const parts: string[] = [];
  if (years > 0) parts.push(`${formatNumber(years)}y`);
  if (days > 0) parts.push(`${formatNumber(days)}d`);
  if (hours > 0) parts.push(`${formatNumber(hours)}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${formatNumber(minutes)}m`);
  return parts.join(" ");
}

/** Format a map length in seconds as e.g. "3:07". */
export function formatMapLength(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/**
 * Parse an api datetime. bancho.py serializes datetimes without timezone
 * info (in the server's timezone, UTC in standard deployments), which the
 * browser would otherwise interpret as local time.
 */
function parseApiDate(date: string): number {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(date);
  return new Date(hasTimezone ? date : `${date}Z`).getTime();
}

/** Format a date as e.g. "3 hours ago". */
export function formatTimeAgo(date: string | number): string {
  // unix timestamps come back in seconds; iso strings via Date parsing
  const then = typeof date === "number" ? date * 1000 : parseApiDate(date);
  const deltaSeconds = Math.round((then - Date.now()) / 1000);

  for (const [unit, secondsPerUnit] of RELATIVE_STEPS) {
    if (Math.abs(deltaSeconds) >= secondsPerUnit) {
      return relativeFormat.format(
        Math.trunc(deltaSeconds / secondsPerUnit),
        unit,
      );
    }
  }
  return "just now";
}

export function formatDate(date: string | number): string {
  const value =
    typeof date === "number" ? new Date(date * 1000) : new Date(parseApiDate(date));
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
