"use client";

import { UsageBarChart } from "@/components/api-keys/usage-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { PERMISSION_RESOURCES } from "@/lib/permissions/catalog";

const RESOURCE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_RESOURCES.map((resource) => [resource.key, resource.label]),
);

const chartConfig = {
  requestCount: { label: "Zapytania", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ApiEndpointUsageChart({
  endpointUsage,
}: {
  endpointUsage: { resource: string; requestCount: number }[];
}) {
  const data = endpointUsage
    .filter((item) => item.requestCount > 0)
    .toSorted((a, b) => b.requestCount - a.requestCount)
    .map((item) => ({
      name: RESOURCE_LABELS[item.resource] ?? item.resource,
      requestCount: item.requestCount,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Najpopularniejsze endpointy</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Żaden endpoint /api/v1 nie obsłużył jeszcze zapytania.
          </p>
        ) : (
          <UsageBarChart
            data={data}
            config={chartConfig}
            className="h-48 w-full"
          />
        )}
      </CardContent>
    </Card>
  );
}
