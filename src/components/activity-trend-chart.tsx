"use client";

import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import type { DailyActivityCount } from "@/components/contribution-heatmap";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { ActivityRange } from "@/lib/activity-range";
import {
  buildVisibleDateRange,
  startOfToday,
  toDateKey,
} from "@/lib/activity-range";

const chartConfig = {
  count: {
    label: "Kontrybucje",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function buildTrendSeries(
  counts: DailyActivityCount[],
  range: ActivityRange,
): { date: string; count: number }[] {
  const countsByDate = new Map(counts.map((c) => [c.date, c.count]));
  const today = startOfToday();
  const visibleRange = buildVisibleDateRange(range, today);
  const endTime = Math.min(visibleRange.end.getTime(), today.getTime());
  const totalDays = Math.floor(
    (endTime - visibleRange.start.getTime()) / (24 * 60 * 60 * 1000),
  );

  const series: { date: string; count: number }[] = [];
  for (let offset = 0; offset <= totalDays; offset++) {
    const date = new Date(visibleRange.start);
    date.setUTCDate(date.getUTCDate() + offset);
    const key = toDateKey(date);
    series.push({ date: key, count: countsByDate.get(key) ?? 0 });
  }
  return series;
}

export function ActivityTrendChart({
  counts,
  range,
}: {
  counts: DailyActivityCount[];
  range: ActivityRange;
}) {
  const series = buildTrendSeries(counts, range);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-32 w-full">
      <AreaChart data={series} margin={{ left: 0, right: 0 }}>
        <defs>
          <linearGradient id="activity-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-count)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-count)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value: ReactNode) =>
                typeof value === "string"
                  ? new Date(value).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })
                  : null
              }
            />
          }
        />
        <Area
          dataKey="count"
          type="monotone"
          fill="url(#activity-trend-fill)"
          stroke="var(--color-count)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
