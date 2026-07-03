"use client";

import { ExternalLink, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ListFilters } from "@/components/list-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { declineNumeric } from "@/lib/polish";

export interface ContributorEntry {
  login: string;
  type: "bot" | "external contributor";
}

const typeLabels: Record<string, string> = {
  bot: "bot",
  "external contributor": "spoza listy",
};

const pageSizeOptions = [10, 25, 50, 100] as const;
const defaultPageSize = 25;

export function ContributorsList({
  contributors,
}: {
  contributors: ContributorEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>(
    searchParameters.get("type") ?? "all",
  );
  const [pageSize, setPageSize] = useState<number>(() => {
    const fromUrl = Number(searchParameters.get("pageSize"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : defaultPageSize;
  });
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParameters.get("page") ?? 1)),
  );

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      const isDefault =
        (key === "q" && stringValue === "") ||
        (key === "type" && stringValue === "all") ||
        (key === "page" && stringValue === "1") ||
        (key === "pageSize" && stringValue === String(defaultPageSize));
      if (isDefault) {
        parameters.delete(key);
      } else {
        parameters.set(key, stringValue);
      }
    }
    router.replace(
      parameters.size === 0 ? pathname : `${pathname}?${parameters.toString()}`,
      { scroll: false },
    );
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contributors.filter((entry) => {
      const matchesQuery =
        normalizedQuery === "" ||
        entry.login.toLowerCase().includes(normalizedQuery);
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [contributors, query, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <ListFilters
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
            updateUrl({ q: value, page: 1 });
          }}
          queryPlaceholder="Szukaj po loginie GitHub…"
          selects={[
            {
              value: typeFilter,
              onValueChange: (value) => {
                setTypeFilter(value);
                setPage(1);
                updateUrl({ type: value, page: 1 });
              },
              placeholder: "Typ",
              options: [
                { value: "all", label: "Wszystkie" },
                ...Object.entries(typeLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
              className: "md:w-44",
            },
          ]}
        />
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
            updateUrl({ pageSize: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full md:w-36">
            <SelectValue placeholder="Na stronę" />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / stronę
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="divide-y rounded-md border text-sm">
        {paginated.map((entry) => (
          <li
            key={entry.login}
            className="flex items-center justify-between gap-2 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <a
                href={`https://github.com/${entry.login}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary flex items-center gap-1 truncate hover:underline"
              >
                {entry.login}
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <Badge variant="outline" className="shrink-0">
                {typeLabels[entry.type]}
              </Badge>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
            >
              <Link
                href={`/members/new?githubUsername=${encodeURIComponent(entry.login)}`}
              >
                <UserPlus />
                Dodaj członka
              </Link>
            </Button>
          </li>
        ))}
        {paginated.length === 0 ? (
          <li className="text-muted-foreground p-2">Brak wyników.</li>
        ) : null}
      </ul>

      <div className="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Wyniki {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filtered.length)} z{" "}
          {declineNumeric(filtered.length, "element", true)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => {
              const nextPage = Math.max(1, currentPage - 1);
              setPage(nextPage);
              updateUrl({ page: nextPage });
            }}
          >
            Poprzednia
          </Button>
          <span>
            Strona {currentPage} z {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount}
            onClick={() => {
              const nextPage = Math.min(pageCount, currentPage + 1);
              setPage(nextPage);
              updateUrl({ page: nextPage });
            }}
          >
            Następna
          </Button>
        </div>
      </div>
    </div>
  );
}
