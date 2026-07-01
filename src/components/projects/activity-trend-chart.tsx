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

const TREND_DAYS = 60;

const chartConfig = {
  count: {
    label: "Zdarzenia",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildTrendSeries(
  counts: DailyActivityCount[],
): { date: string; count: number }[] {
  const countsByDate = new Map(counts.map((c) => [c.date, c.count]));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const series: { date: string; count: number }[] = [];
  for (let offset = TREND_DAYS - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = toDateKey(date);
    series.push({ date: key, count: countsByDate.get(key) ?? 0 });
  }
  return series;
}

export function ActivityTrendChart({
  counts,
}: {
  counts: DailyActivityCount[];
}) {
  const series = buildTrendSeries(counts);

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
