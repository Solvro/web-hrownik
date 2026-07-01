import type { ActivityRange } from "@/lib/activity-range";
import {
  buildVisibleDateRange,
  dateFromParts,
  startOfToday,
  toDateKey,
} from "@/lib/activity-range";
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

// One year's worth of columns is kept on screen; switching the selected
// range slides this track sideways instead of rebuilding the grid.
const VISIBLE_WEEKS = 53;

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

interface Day {
  date: Date;
  count: number;
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

export function ContributionHeatmap({
  counts,
  range,
  availableYears,
}: {
  counts: DailyActivityCount[];
  range: ActivityRange;
  availableYears: number[];
}) {
  const countsByDate = new Map(counts.map((c) => [c.date, c.count]));
  const today = startOfToday();
  const visibleRange = buildVisibleDateRange(range, today);

  const earliestYear = Math.min(...availableYears, today.getUTCFullYear());
  const earliestYearStart = dateFromParts(earliestYear, 0, 1);
  const rollingWindowStart = buildVisibleDateRange(
    { type: "last-year" },
    today,
  ).start;
  const trackStart = new Date(
    Math.min(rollingWindowStart.getTime(), earliestYearStart.getTime()),
  );

  const weeks = buildWeeks(countsByDate, trackStart, today);
  const totalWeeks = weeks.length;
  const startIndex = Math.max(
    weeks.findIndex(
      (week) =>
        week[0].date <= visibleRange.start &&
        visibleRange.start <= week[6].date,
    ),
    0,
  );
  const trackWidthPercent = (totalWeeks / VISIBLE_WEEKS) * 100;
  const translatePercent =
    totalWeeks === 0 ? 0 : (startIndex / totalWeeks) * 100;

  const monthLabels: { startWeek: number; endWeek: number; label: string }[] =
    [];
  let lastMonth = -1;
  for (const [weekIndex, week] of weeks.entries()) {
    const firstDay = week.find((day) => day.date.getUTCDate() <= 7);
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

  const gridTemplateColumns = `repeat(${String(totalWeeks)}, minmax(0, 1fr))`;

  return (
    <div className="min-w-0 space-y-1">
      <div className="min-w-0 overflow-hidden">
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{
            width: `${String(trackWidthPercent)}%`,
            transform: `translateX(-${String(translatePercent)}%)`,
          }}
        >
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
                      day.date < trackStart || day.date > today
                        ? "invisible"
                        : LEVEL_CLASS[levelForCount(day.count)],
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
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
  );
}
