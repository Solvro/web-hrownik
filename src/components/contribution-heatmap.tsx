"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DailyActivityCount {
  date: string; // YYYY-MM-DD
  count: number;
}

const MONTH_LABELS_PL = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

const LEVEL_CLASS = [
  "bg-muted",
  "bg-emerald-950",
  "bg-emerald-800",
  "bg-emerald-600",
  "bg-emerald-400",
] as const;

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) {
    return 0;
  }
  if (count === 1) {
    return 1;
  }
  if (count <= 3) {
    return 2;
  }
  if (count <= 6) {
    return 3;
  }
  return 4;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface Day {
  date: Date;
  count: number;
}

type HeatmapRange = { type: "last-year" } | { type: "year"; year: number };

function dateFromParts(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function yearFromDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

function buildAvailableYears(counts: DailyActivityCount[]): number[] {
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

function buildWeeks(
  countsByDate: Map<string, number>,
  firstVisibleDay: Date,
  lastVisibleDay: Date,
): Day[][] {
  const start = new Date(firstVisibleDay);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(lastVisibleDay);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const weekCount =
    Math.floor((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) +
    1;

  const weeks: Day[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const week: Day[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + weekIndex * 7 + day);
      week.push({ date, count: countsByDate.get(toDateKey(date)) ?? 0 });
    }
    weeks.push(week);
  }
  return weeks;
}

function buildLastYearRange(today: Date): { start: Date; end: Date } {
  return {
    start: dateFromParts(today.getUTCFullYear(), today.getUTCMonth() - 11, 1),
    end: today,
  };
}

export function ContributionHeatmap({
  counts,
}: {
  counts: DailyActivityCount[];
}) {
  const countsByDate = new Map(counts.map((c) => [c.date, c.count]));
  const availableYears = buildAvailableYears(counts);
  const now = new Date();
  const today = dateFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  const [selectedRange, setSelectedRange] = useState<HeatmapRange>({
    type: "last-year",
  });
  const visibleRange =
    selectedRange.type === "last-year"
      ? buildLastYearRange(today)
      : {
          start: dateFromParts(selectedRange.year, 0, 1),
          end: dateFromParts(selectedRange.year, 11, 31),
        };
  const weeks = buildWeeks(countsByDate, visibleRange.start, visibleRange.end);

  const monthLabels: { startWeek: number; endWeek: number; label: string }[] =
    [];
  let lastMonth = -1;
  for (const [weekIndex, week] of weeks.entries()) {
    const firstDay = week.find(
      (day) =>
        day.date >= visibleRange.start &&
        day.date <= visibleRange.end &&
        day.date.getUTCDate() <= 7,
    );
    if (firstDay !== undefined && firstDay.date.getUTCMonth() !== lastMonth) {
      lastMonth = firstDay.date.getUTCMonth();
      const previousLabel = monthLabels.at(-1);
      if (previousLabel !== undefined) {
        previousLabel.endWeek = weekIndex;
      }
      monthLabels.push({
        startWeek: weekIndex,
        endWeek: weeks.length,
        label: MONTH_LABELS_PL[lastMonth] ?? "",
      });
    }
  }

  const gridTemplateColumns = `repeat(${String(weeks.length)}, minmax(0, 1fr))`;

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-1">
        <div className="min-w-0 overflow-hidden">
          <div className="grid gap-1" style={{ gridTemplateColumns }}>
            {monthLabels.map((monthLabel) => (
              <span
                key={monthLabel.startWeek}
                className="text-muted-foreground truncate text-xs"
                style={{
                  gridColumn: `${String(monthLabel.startWeek + 1)} / ${String(monthLabel.endWeek + 1)}`,
                }}
              >
                {monthLabel.label}
              </span>
            ))}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns }}>
            {weeks.map((week) => (
              <div key={week[0].date.toISOString()} className="grid gap-1">
                {week.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    title={`${day.date.toLocaleDateString("pl-PL", { timeZone: "UTC" })}: ${String(day.count)}`}
                    className={cn(
                      "aspect-square w-full rounded-sm",
                      day.date < visibleRange.start ||
                        day.date > visibleRange.end ||
                        day.date > today
                        ? "invisible"
                        : LEVEL_CLASS[levelForCount(day.count)],
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
          <span>mniej</span>
          {LEVEL_CLASS.map((levelClass) => (
            <div
              key={levelClass}
              className={cn("size-3 rounded-sm", levelClass)}
            />
          ))}
          <span>więcej</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
        <Button
          type="button"
          size="xs"
          variant={selectedRange.type === "last-year" ? "default" : "ghost"}
          onClick={() => {
            setSelectedRange({ type: "last-year" });
          }}
          aria-pressed={selectedRange.type === "last-year"}
          className="justify-start"
        >
          Ostatni rok
        </Button>
        {availableYears.map((year) => (
          <Button
            key={year}
            type="button"
            size="xs"
            variant={
              selectedRange.type === "year" && year === selectedRange.year
                ? "default"
                : "ghost"
            }
            onClick={() => {
              setSelectedRange({ type: "year", year });
            }}
            aria-pressed={
              selectedRange.type === "year" && year === selectedRange.year
            }
            className="justify-start"
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  );
}
