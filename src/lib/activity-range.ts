import type { DailyActivityCount } from "@/components/contribution-heatmap";

export type ActivityRange =
  { type: "last-year" } | { type: "year"; year: number };

export function dateFromParts(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function startOfToday(): Date {
  const now = new Date();
  return dateFromParts(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yearFromDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

export function buildAvailableYears(counts: DailyActivityCount[]): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);

  for (const count of counts) {
    const year = yearFromDateKey(count.date);
    if (Number.isFinite(year)) {
      years.add(year);
    }
  }

  return [...years].toSorted((a, b) => b - a);
}

export function buildVisibleDateRange(
  range: ActivityRange,
  today: Date,
): { start: Date; end: Date } {
  if (range.type === "year") {
    return {
      start: dateFromParts(range.year, 0, 1),
      end: dateFromParts(range.year, 11, 31),
    };
  }
  return {
    start: dateFromParts(today.getUTCFullYear(), today.getUTCMonth() - 11, 1),
    end: today,
  };
}

export function sumCountsInRange(
  counts: DailyActivityCount[],
  range: { start: Date; end: Date },
  today: Date,
): number {
  return counts.reduce((sum, count) => {
    const date = new Date(`${count.date}T00:00:00.000Z`);
    return date >= range.start && date <= range.end && date <= today
      ? sum + count.count
      : sum;
  }, 0);
}
