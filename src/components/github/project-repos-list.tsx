"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AssignRepoToTeam } from "@/components/github/assign-repo-to-team";
import { ListFilters } from "@/components/list-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { declineNumeric } from "@/lib/polish";

export interface ProjectRepoEntry {
  id: string;
  githubRepoFullName: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
}

export interface ProjectTeamEntry {
  id: string;
  name: string;
}

const pageSizeOptions = [10, 25, 50, 100] as const;
const defaultPageSize = 25;

export function ProjectReposWithoutTeamList({
  repos,
  teamsByProjectId,
}: {
  repos: ProjectRepoEntry[];
  teamsByProjectId: Record<string, ProjectTeamEntry[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [projectFilter, setProjectFilter] = useState<string>(
    searchParameters.get("project") ?? "all",
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
        (key === "project" && stringValue === "all") ||
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

  const projectOptions = useMemo(() => {
    const seen = new Set<string>();
    return repos
      .filter((repo) => {
        if (seen.has(repo.projectId)) {
          return false;
        }
        seen.add(repo.projectId);
        return true;
      })
      .map((repo) => ({
        value: repo.projectId,
        label: repo.projectName,
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label, "pl"));
  }, [repos]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return repos.filter((repo) => {
      const matchesQuery =
        normalizedQuery === "" ||
        repo.githubRepoFullName.toLowerCase().includes(normalizedQuery) ||
        repo.projectName.toLowerCase().includes(normalizedQuery);
      const matchesProject =
        projectFilter === "all" || repo.projectId === projectFilter;
      return matchesQuery && matchesProject;
    });
  }, [repos, query, projectFilter]);

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
          queryPlaceholder="Szukaj po nazwie repozytorium lub projektu…"
          selects={[
            {
              value: projectFilter,
              onValueChange: (value) => {
                setProjectFilter(value);
                setPage(1);
                updateUrl({ project: value, page: 1 });
              },
              placeholder: "Projekt",
              options: [
                { value: "all", label: "Wszystkie projekty" },
                ...projectOptions,
              ],
              className: "md:w-52",
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
        {paginated.map((repo) => (
          <li
            key={repo.id}
            className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/projects/${repo.projectSlug}`}
                className="shrink-0 hover:underline"
              >
                {repo.projectName}
              </Link>
              <span className="text-muted-foreground">·</span>
              <a
                href={`https://github.com/${repo.githubRepoFullName}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate hover:underline"
              >
                {repo.githubRepoFullName}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
            <AssignRepoToTeam
              repoId={repo.id}
              repoFullName={repo.githubRepoFullName}
              projectId={repo.projectId}
              projectName={repo.projectName}
              teams={teamsByProjectId[repo.projectId] ?? []}
            />
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
          {declineNumeric(filtered.length, "repozytorium", true)}
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
