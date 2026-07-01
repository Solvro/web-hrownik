"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const NAME_TRUNCATE_LENGTH = 20;

function truncateName(name: string) {
  return name.length > NAME_TRUNCATE_LENGTH
    ? `${name.slice(0, NAME_TRUNCATE_LENGTH - 1)}…`
    : name;
}

export function UsageBarChart({
  data,
  config,
  className,
}: {
  data: { name: string; requestCount: number }[];
  config: ChartConfig;
  className?: string;
}) {
  return (
    <ChartContainer config={config} className={className ?? "h-64 w-full"}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28 }}>
        {/* Bar's numeric axis defaults to an "auto" (non-zero) domain, which
            makes bar lengths misleading — pin it to 0 so they're grounded
            and proportional. */}
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tickFormatter={truncateName}
        />
        <ChartTooltip
          content={<ChartTooltipContent nameKey="name" hideLabel />}
        />
        <Bar
          dataKey="requestCount"
          fill="var(--chart-2)"
          radius={4}
          maxBarSize={28}
        >
          <LabelList
            dataKey="requestCount"
            position="right"
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
