"use client";

import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { linkRepoToProject, linkRepoToProjectAndTeam } from "@/actions/github";
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

export interface ProjectOption {
  id: string;
  name: string;
}

export interface TeamOption {
  id: string;
  name: string;
  projectId: string;
}

const pageSizeOptions = [10, 25, 50, 100] as const;
const defaultPageSize = 25;

export function UnlinkedReposList({
  repos,
  projects,
  teams,
}: {
  repos: string[];
  projects: ProjectOption[];
  teams: TeamOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [pageSize, setPageSize] = useState<number>(() => {
    const fromUrl = Number(searchParameters.get("pageSize"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : defaultPageSize;
  });
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParameters.get("page") ?? 1)),
  );
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      const isDefault =
        (key === "q" && stringValue === "") ||
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
    if (normalizedQuery === "") {
      return repos;
    }
    return repos.filter((fullName) =>
      fullName.toLowerCase().includes(normalizedQuery),
    );
  }, [repos, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  async function handleAssign(fullName: string, formData: FormData) {
    setAssigning((previous) => ({ ...previous, [fullName]: true }));
    setError(null);
    try {
      const projectId = formData.get("projectId") as string;
      const teamId = formData.get("teamId") as string;
      await (teamId !== "" && teamId !== "none"
        ? linkRepoToProjectAndTeam(fullName, projectId, teamId)
        : linkRepoToProject(fullName, projectId));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setAssigning((previous) => ({ ...previous, [fullName]: false }));
    }
  }

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
          queryPlaceholder="Szukaj po nazwie repozytorium…"
          selects={[]}
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

      <div className="flex-1">
        <ul className="divide-y rounded-md border text-sm">
          {paginated.map((fullName) => (
            <li
              key={fullName}
              className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2">
                <a
                  href={`https://github.com/${fullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 truncate hover:underline"
                >
                  {fullName}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
                <Link
                  href={`/projects/new?repository=${encodeURIComponent(fullName)}`}
                  className="hover:text-foreground text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs transition-colors hover:underline"
                >
                  <Plus className="size-3" />
                  nowy projekt
                </Link>
              </div>
              <form
                action={async (formData) => {
                  await handleAssign(fullName, formData);
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <Select name="projectId" required>
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue placeholder="Wybierz projekt" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select name="teamId" defaultValue="none">
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue placeholder="Zespół (opcjonalnie)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez zespołu</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8"
                  disabled={assigning[fullName]}
                >
                  {assigning[fullName] ? "Przypisywanie…" : "Przypisz"}
                </Button>
              </form>
            </li>
          ))}
          {paginated.length === 0 ? (
            <li className="text-muted-foreground p-2">Brak wyników.</li>
          ) : null}
          {error === null ? null : (
            <li className="text-destructive p-2 text-xs">{error}</li>
          )}
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
