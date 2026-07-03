"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AssignRepoToTeam } from "@/components/github/assign-repo-to-team";
import { Button } from "@/components/ui/button";
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
  const query = searchParameters.get("q") ?? "";
  const projectFilter = searchParameters.get("project") ?? "all";
  const pageSize = (() => {
    const fromUrl = Number(searchParameters.get("pageSize"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : defaultPageSize;
  })();
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParameters.get("page") ?? 1)),
  );

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      if (key === "page" && stringValue === "1") {
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
      <div className="flex-1">
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
      </div>

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
