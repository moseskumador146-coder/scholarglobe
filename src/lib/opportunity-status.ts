export type OpStatus = "OPEN" | "UPCOMING" | "CLOSED" | "ROLLING";

export interface CycleWindow {
  status: OpStatus;
  /** Date the current/next window opens (ISO) */
  nextOpen?: string;
  /** Date the current/next window closes (ISO) */
  nextClose?: string;
  label: string;
}

function inYear(month: number, day: number, year: number): Date {
  // Clamp day to valid range of month
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day ?? 1, lastDay)));
}

/**
 * Computes the recurring application window status for a given "now" date.
 * Windows may cross the year boundary (e.g. Nov 15 -> Jan 15).
 */
export function computeCycle(
  op: {
    rolling: boolean;
    opensMonth?: number | null;
    opensDay?: number | null;
    closesMonth?: number | null;
    closesDay?: number | null;
    cycleNote?: string | null;
  },
  now: Date = new Date()
): CycleWindow {
  if (op.rolling || !op.opensMonth || !op.closesMonth) {
    return { status: "ROLLING", label: "Rolling admissions — apply anytime" };
  }
  const y = now.getUTCFullYear();
  const open = inYear(op.opensMonth, op.opensDay ?? 1, y);
  let close = inYear(op.closesMonth, op.closesDay ?? 28, y);

  if (close.getTime() < open.getTime()) {
    // Cross-year window (e.g. Nov 15 -> Jan 15)
    close = inYear(op.closesMonth, op.closesDay ?? 28, y + 1);
  }

  const t = now.getTime();
  if (t >= open.getTime() && t <= close.getTime()) {
    const daysLeft = Math.max(0, Math.ceil((close.getTime() - t) / 86400000));
    return {
      status: "OPEN",
      nextOpen: open.toISOString(),
      nextClose: close.toISOString(),
      label: daysLeft <= 45 ? `Closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `Open until ${close.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
    };
  }
  if (t < open.getTime()) {
    return {
      status: "UPCOMING",
      nextOpen: open.toISOString(),
      nextClose: close.toISOString(),
      label: `Opens ${open.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
    };
  }
  // Passed this year's close -> next cycle opens next year (for cross-year) or same date next year
  const nextOpen = inYear(op.opensMonth, op.opensDay ?? 1, y + 1);
  let nextClose = inYear(op.closesMonth, op.closesDay ?? 28, y + 1);
  if (nextClose.getTime() < nextOpen.getTime()) {
    nextClose = inYear(op.closesMonth, op.closesDay ?? 28, y + 2);
  }
  return {
    status: "CLOSED",
    nextOpen: nextOpen.toISOString(),
    nextClose: nextClose.toISOString(),
    label: `Next cycle ${nextOpen.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
  };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const CONTINENT_COLORS: Record<string, string> = {
  Europe: "#f59e0b",       // amber
  Asia: "#10b981",         // emerald
  "Middle East": "#f97316",// orange
  Africa: "#84cc16",       // lime
  "North America": "#e879f9", // fuchsia
  "South America": "#22d3ee", // cyan
  Oceania: "#fb7185",      // rose
};
