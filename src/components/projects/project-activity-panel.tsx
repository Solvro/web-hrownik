"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { syncProjectActivity } from "@/actions/projects";
import { ActivityRangePicker } from "@/components/activity-range-picker";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import type { DailyActivityCount } from "@/components/contribution-heatmap";
import { ActivityTrendChart } from "@/components/projects/activity-trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityRange } from "@/lib/activity-range";
import {
  buildAvailableYears,
  buildVisibleDateRange,
  startOfToday,
  sumCountsInRange,
} from "@/lib/activity-range";
import type { SyncResult } from "@/lib/integrations/github-activity";
import { declineNumeric } from "@/lib/polish";

export function ProjectActivityPanel({
  projectId,
  canManage,
  counts,
  autoSync = false,
}: {
  projectId: string;
  canManage: boolean;
  counts: DailyActivityCount[];
  autoSync?: boolean;
}) {
  const router = useRouter();
  const autoSyncStarted = useRef(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<ActivityRange>({
    type: "last-year",
  });

  const runSync = useCallback(
    async (clearAutoSyncUrl = false) => {
      setPending(true);
      setSummary(null);
      setResults(null);
      try {
        const syncResults = await syncProjectActivity(projectId);
        setResults(syncResults);
        setSummary(formatSyncSummary(syncResults));
        router.refresh();
      } catch (error) {
        setSummary(
          error instanceof Error ? error.message : "Błąd synchronizacji.",
        );
      } finally {
        setPending(false);
        if (clearAutoSyncUrl) {
          router.replace(`/projects/${projectId}`, { scroll: false });
        }
      }
    },
    [projectId, router],
  );

  useEffect(() => {
    // Auto-sync is intentionally triggered by the post-create redirect flag.
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
    if (!autoSync || autoSyncStarted.current) {
      return;
    }
    autoSyncStarted.current = true;
    void runSync(true);
  }, [autoSync, runSync]);

  const availableYears = useMemo(() => buildAvailableYears(counts), [counts]);
  const totalInRange = useMemo(() => {
    const today = startOfToday();
    const visibleRange = buildVisibleDateRange(selectedRange, today);
    return sumCountsInRange(counts, visibleRange, today);
  }, [counts, selectedRange]);

  const failed = results?.filter((result) => result.error !== undefined) ?? [];

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <CardTitle>Aktywność</CardTitle>
            <span className="text-muted-foreground text-sm">
              {declineNumeric(totalInRange, "kontrybucja")}
            </span>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void runSync()}
            >
              <RefreshCw className={pending ? "animate-spin" : undefined} />
              {pending ? "Pobieranie aktywności" : "Synchronizuj aktywność"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending ? (
          <ActivityHeatmapSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-4">
              {counts.length > 0 ? (
                <ActivityTrendChart counts={counts} range={selectedRange} />
              ) : null}
              <ContributionHeatmap counts={counts} range={selectedRange} />
            </div>
            <ActivityRangePicker
              selected={selectedRange}
              availableYears={availableYears}
              onSelect={setSelectedRange}
            />
          </div>
        )}
        {summary === null ? null : (
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>{summary}</p>
            {failed.length === 0 ? null : (
              <ul className="space-y-1">
                {failed.map((result) => (
                  <li key={result.repo}>
                    <span className="font-medium">{result.repo}</span>:{" "}
                    {result.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityHeatmapSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-32 w-full" />
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(53, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 371 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-sm" />
          ))}
        </div>
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

function formatSyncSummary(results: SyncResult[]): string {
  const totalEvents = results.reduce(
    (sum, result) => sum + (result.eventsFetched ?? 0),
    0,
  );
  const failed = results.filter((result) => result.error !== undefined);
  if (failed.length > 0) {
    return `Pobrano ${declineNumeric(totalEvents, "zdarzenie")}, ${declineNumeric(failed.length, "repozytorium")} z błędem.`;
  }
  return `Pobrano ${declineNumeric(totalEvents, "zdarzenie")}.`;
}
