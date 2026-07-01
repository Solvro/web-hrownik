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

function buildWeeks(countsByDate: Map<string, number>): Day[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = 371;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  start.setDate(start.getDate() - start.getDay());

  const weekCount =
    Math.floor(
      (today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    ) + 1;

  const weeks: Day[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const week: Day[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(start);
      date.setDate(start.getDate() + weekIndex * 7 + day);
      week.push({ date, count: countsByDate.get(toDateKey(date)) ?? 0 });
    }
    weeks.push(week);
  }
  return weeks;
}

export function ContributionHeatmap({
  counts,
}: {
  counts: DailyActivityCount[];
}) {
  const countsByDate = new Map(counts.map((c) => [c.date, c.count]));
  const weeks = buildWeeks(countsByDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabels: { startWeek: number; endWeek: number; label: string }[] =
    [];
  let lastMonth = -1;
  for (const [weekIndex, week] of weeks.entries()) {
    const firstDay = week[0];
    if (firstDay.date.getMonth() !== lastMonth) {
      lastMonth = firstDay.date.getMonth();
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
    <div className="flex w-full flex-col gap-1">
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
                title={`${day.date.toLocaleDateString("pl-PL")}: ${String(day.count)}`}
                className={cn(
                  "aspect-square w-full rounded-sm",
                  day.date > today
                    ? "invisible"
                    : LEVEL_CLASS[levelForCount(day.count)],
                )}
              />
            ))}
          </div>
        ))}
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
