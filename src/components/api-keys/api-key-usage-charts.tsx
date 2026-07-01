"use client";

import { Pie, PieChart, Label as RechartsLabel } from "recharts";

import { UsageBarChart } from "@/components/api-keys/usage-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface UsageDatum {
  name: string;
  requestCount: number;
}

function buildChartData(data: UsageDatum[]) {
  return data
    .filter((item) => item.requestCount > 0)
    .toSorted((a, b) => b.requestCount - a.requestCount)
    .map((item, index) => ({
      ...item,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

function buildChartConfig(data: { name: string; fill: string }[]): ChartConfig {
  return Object.fromEntries(
    data.map((item) => [item.name, { label: item.name, color: item.fill }]),
  );
}

export function ApiKeyUsageCharts({
  apiKeys,
}: {
  apiKeys: { name: string; requestCount: number }[];
}) {
  const used = buildChartData(apiKeys);
  const chartConfig = buildChartConfig(used);
  const total = used.reduce((sum, item) => sum + item.requestCount, 0);

  if (used.length === 0) {
    return (
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle>Wykorzystanie kluczy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Żaden klucz nie obsłużył jeszcze zapytania do /api/v1.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Najczęściej używany klucz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The legend lives outside the chart (below) rather than as a
              recharts <Legend>: a Legend inside PieChart reserves its own
              vertical slice of the container, which shrinks and off-centers
              the ring. Keeping it out lets the donut use the full height. */}
          <ChartContainer config={chartConfig} className="mx-auto h-72 w-full">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />
              <Pie
                data={used}
                dataKey="requestCount"
                nameKey="name"
                innerRadius="60%"
                outerRadius="90%"
                strokeWidth={4}
              >
                <RechartsLabel
                  content={({ viewBox }) => {
                    if (
                      viewBox === undefined ||
                      !("cx" in viewBox) ||
                      !("cy" in viewBox)
                    ) {
                      return null;
                    }
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          zapytań
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {used.map((item) => (
              <li
                key={item.name}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.fill }}
                />
                {item.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Liczba zapytań na klucz</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageBarChart
            data={used}
            config={chartConfig}
            className="h-72 w-full"
          />
        </CardContent>
      </Card>
    </>
  );
}
