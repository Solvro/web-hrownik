"use client";

import { useMemo, useState } from "react";

import { ActivityRangePicker } from "@/components/activity-range-picker";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import type { DailyActivityCount } from "@/components/contribution-heatmap";
import type { ActivityRange } from "@/lib/activity-range";
import { buildAvailableYears } from "@/lib/activity-range";

export function HeatmapWithRangePicker({
  counts,
}: {
  counts: DailyActivityCount[];
}) {
  const [range, setRange] = useState<ActivityRange>({ type: "last-year" });
  const availableYears = useMemo(() => buildAvailableYears(counts), [counts]);

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <ContributionHeatmap counts={counts} range={range} />
      <ActivityRangePicker
        selected={range}
        availableYears={availableYears}
        onSelect={setRange}
      />
    </div>
  );
}
