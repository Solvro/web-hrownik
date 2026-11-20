import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecruitmentImportRowResult } from "@/lib/member-import/recruitment";
import type { ImportSummary as ImportSummaryData } from "@/lib/member-import/summary";

const outcomeLabels: Record<RecruitmentImportRowResult["outcome"], string> = {
  created: "dodano",
  skipped_duplicate: "pominięto",
  error: "błąd",
};

export function ImportSummary({
  summary,
  onRestart,
}: {
  summary: ImportSummaryData<RecruitmentImportRowResult>;
  onRestart: () => void;
}) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>Utworzono: {summary.created}</Badge>
        {summary.skipped > 0 ? (
          <Badge variant="secondary">
            Pominięto duplikaty: {summary.skipped}
          </Badge>
        ) : null}
        {summary.errors > 0 ? (
          <Badge variant="destructive">Błędy: {summary.errors}</Badge>
        ) : null}
      </div>

      <ul className="divide-y rounded-md border text-sm">
        {summary.rows.map((row) => (
          <li
            key={row.rowNumber}
            className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:gap-2"
          >
            <span className="text-muted-foreground w-24 shrink-0">
              Wiersz {row.rowNumber}
            </span>
            <span className="font-medium">
              {row.memberId === undefined ? (
                row.fullName
              ) : (
                <Link href={`/members/${row.memberId}`} className="underline">
                  {row.fullName}
                </Link>
              )}
            </span>
            <span
              className={
                row.outcome === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {outcomeLabels[row.outcome]}
              {row.detail === undefined ? "" : ` — ${row.detail}`}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button asChild>
          <Link href="/members">Przejdź do listy członków</Link>
        </Button>
        <Button type="button" variant="outline" onClick={onRestart}>
          Importuj kolejny plik
        </Button>
      </div>
    </div>
  );
}
