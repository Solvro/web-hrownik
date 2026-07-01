"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { syncProjectActivity } from "@/actions/projects";
import { Button } from "@/components/ui/button";

export function SyncActivityButton({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleSync() {
    setPending(true);
    setSummary(null);
    try {
      const results = await syncProjectActivity(projectId);
      const totalEvents = results.reduce(
        (sum, result) => sum + (result.eventsFetched ?? 0),
        0,
      );
      const failed = results.filter((result) => result.error !== undefined);
      setSummary(
        failed.length > 0
          ? `Pobrano ${totalEvents} zdarzeń, ${failed.length} repo z błędem.`
          : `Pobrano ${totalEvents} nowych zdarzeń.`,
      );
    } catch (error) {
      setSummary(
        error instanceof Error ? error.message : "Błąd synchronizacji.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void handleSync()}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        Synchronizuj aktywność
      </Button>
      {summary === null ? null : (
        <span className="text-muted-foreground text-sm">{summary}</span>
      )}
    </div>
  );
}
