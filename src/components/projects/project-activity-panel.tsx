"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { syncProjectActivity } from "@/actions/projects";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import type { DailyActivityCount } from "@/components/contribution-heatmap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SyncResult } from "@/lib/integrations/github-activity";

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

  // Auto-sync is intentionally triggered by the post-create redirect flag.
  // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
  useEffect(() => {
    if (!autoSync || autoSyncStarted.current) {
      return;
    }
    autoSyncStarted.current = true;
    void runSync(true);
  }, [autoSync, runSync]);

  const failed = results?.filter((result) => result.error !== undefined) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-muted-foreground text-sm font-medium">
          Aktywność &middot; cała historia
        </h3>
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
      {pending ? (
        <ActivityHeatmapSkeleton />
      ) : (
        <ContributionHeatmap counts={counts} />
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
    </div>
  );
}

function ActivityHeatmapSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-full" />
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
    return `Pobrano ${totalEvents} zdarzeń, ${failed.length} repozytoriów z błędem.`;
  }
  return `Pobrano ${totalEvents} nowych zdarzeń.`;
}
