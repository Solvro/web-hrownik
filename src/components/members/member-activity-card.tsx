"use client";

import { useMemo, useState } from "react";

import { ActivityRangePicker } from "@/components/activity-range-picker";
import { ActivityTrendChart } from "@/components/activity-trend-chart";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import type { DailyActivityCount } from "@/components/contribution-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityRange } from "@/lib/activity-range";
import {
  buildAvailableYears,
  buildVisibleDateRange,
  startOfToday,
  sumCountsInRange,
} from "@/lib/activity-range";
import { declineNumeric } from "@/lib/polish";

export function MemberActivityCard({
  counts,
}: {
  counts: DailyActivityCount[];
}) {
  const [selectedRange, setSelectedRange] = useState<ActivityRange>({
    type: "last-year",
  });

  const availableYears = useMemo(() => buildAvailableYears(counts), [counts]);
  const totalInRange = useMemo(() => {
    const today = startOfToday();
    const visibleRange = buildVisibleDateRange(selectedRange, today);
    return sumCountsInRange(counts, visibleRange, today);
  }, [counts, selectedRange]);

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle>Aktywność</CardTitle>
          <span className="text-muted-foreground text-sm">
            {declineNumeric(totalInRange, "kontrybucja")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-4">
            {counts.length > 0 ? (
              <ActivityTrendChart counts={counts} range={selectedRange} />
            ) : null}
            <ContributionHeatmap
              counts={counts}
              range={selectedRange}
              availableYears={availableYears}
            />
          </div>
          <ActivityRangePicker
            selected={selectedRange}
            availableYears={availableYears}
            onSelect={setSelectedRange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
