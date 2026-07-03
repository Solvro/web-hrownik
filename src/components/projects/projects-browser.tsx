"use client";

import { FileWarning } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ListFilters } from "@/components/list-filters";
import {
  ProjectStatusBadge,
  projectStatusLabels,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { declineNumeric } from "@/lib/polish";

type ProjectStatus = "active" | "completed" | "suspended";
type ProjectVisibility = "internal" | "public";
type VisibilityFilter = ProjectVisibility | "all";
type StatusFilter = ProjectStatus | "all";
type SortMode = "name-asc" | "name-desc" | "status-asc" | "visibility-asc";

export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  startedAt: Date | null;
  endedAt: Date | null;
  projectCardDriveUrl: string | null;
  reportDriveUrl: string | null;
}

const pageSizeOptions = [12, 24, 48] as const;
const defaultPageSize = 12;

const visibilityLabels: Record<ProjectVisibility, string> = {
  internal: "wewnętrzny",
  public: "publiczny",
};

export function ProjectsBrowser({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    (searchParameters.get("status") as StatusFilter | null) ?? "all",
  );
  const [visibility, setVisibility] = useState<VisibilityFilter>(
    (searchParameters.get("visibility") as VisibilityFilter | null) ?? "all",
  );
  const [startDate, setStartDate] = useState(
    searchParameters.get("startDate") ?? "",
  );
  const [endDate, setEndDate] = useState(searchParameters.get("endDate") ?? "");
  const [sort, setSort] = useState<SortMode>(
    (searchParameters.get("sort") as SortMode | null) ?? "name-asc",
  );
  const [pageSize, setPageSize] = useState<number>(() => {
    const fromUrl = Number(searchParameters.get("pageSize"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : defaultPageSize;
  });
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParameters.get("page") ?? 1)),
  );

  useEffect(() => {
    if (searchParameters.has("pageSize")) {
      return;
    }
    const stored = Number(localStorage.getItem("projects-page-size"));
    if (Number.isFinite(stored) && stored > 0) {
      setPageSize(stored);
    }
  }, [searchParameters]);

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      const isDefault =
        (key === "q" && stringValue === "") ||
        (["status", "visibility"].includes(key) && stringValue === "all") ||
        (["startDate", "endDate"].includes(key) && stringValue === "") ||
        (key === "sort" && stringValue === "name-asc") ||
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
    const startFilter =
      startDate === "" ? null : new Date(`${startDate}T00:00:00`);
    const endFilter = endDate === "" ? null : new Date(`${endDate}T23:59:59`);

    return projects
      .filter((project) => status === "all" || project.status === status)
      .filter(
        (project) => visibility === "all" || project.visibility === visibility,
      )
      .filter((project) => {
        if (startFilter === null && endFilter === null) {
          return true;
        }
        const date = project.startedAt ?? project.endedAt;
        if (date === null) {
          return startFilter === null;
        }
        if (startFilter !== null && date < startFilter) {
          return false;
        }
        if (endFilter !== null && date > endFilter) {
          return false;
        }
        return true;
      })
      .filter((project) => {
        if (normalizedQuery === "") {
          return true;
        }

        return [
          project.name,
          projectStatusLabels[project.status],
          visibilityLabels[project.visibility],
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .toSorted((first, second) => {
        if (sort === "name-desc") {
          return second.name.localeCompare(first.name, "pl");
        }
        if (sort === "status-asc") {
          return projectStatusLabels[first.status].localeCompare(
            projectStatusLabels[second.status],
            "pl",
          );
        }
        if (sort === "visibility-asc") {
          return visibilityLabels[first.visibility].localeCompare(
            visibilityLabels[second.visibility],
            "pl",
          );
        }

        return first.name.localeCompare(second.name, "pl");
      });
  }, [projects, query, sort, status, visibility, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <ListFilters
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
            updateUrl({ q: value, page: 1 });
          }}
          queryPlaceholder="Szukaj po nazwie, statusie lub widoczności..."
          selects={[
            {
              value: status,
              onValueChange: (value) => {
                setStatus(value as StatusFilter);
                setPage(1);
                updateUrl({ status: value, page: 1 });
              },
              placeholder: "Status",
              options: [
                { value: "all", label: "Wszystkie statusy" },
                ...Object.entries(projectStatusLabels).map(
                  ([value, label]) => ({
                    value,
                    label,
                  }),
                ),
              ],
              className: "md:w-44",
            },
            {
              value: visibility,
              onValueChange: (value) => {
                setVisibility(value as VisibilityFilter);
                setPage(1);
                updateUrl({ visibility: value, page: 1 });
              },
              placeholder: "Widoczność",
              options: [
                { value: "all", label: "Wszystkie widoczności" },
                ...Object.entries(visibilityLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
              className: "md:w-52",
            },
            {
              value: sort,
              onValueChange: (value) => {
                setSort(value as SortMode);
                updateUrl({ sort: value });
              },
              placeholder: "Sortowanie",
              kind: "sort",
              options: [
                { value: "name-asc", label: "nazwa A-Z" },
                { value: "name-desc", label: "nazwa Z-A" },
                { value: "status-asc", label: "status" },
                { value: "visibility-asc", label: "widoczność" },
              ],
              className: "md:w-44",
            },
          ]}
        />
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            localStorage.setItem("projects-page-size", value);
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
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Data od"
            value={startDate}
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              setPage(1);
              updateUrl({ startDate: value, page: 1 });
            }}
            className="w-40"
          />
          <Input
            type="date"
            aria-label="Data do"
            value={endDate}
            onChange={(event) => {
              const value = event.target.value;
              setEndDate(value);
              setPage(1);
              updateUrl({ endDate: value, page: 1 });
            }}
            className="w-40"
          />
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              transitionTypes={["nav-forward"]}
              className="hover:bg-accent min-w-0 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 font-medium break-words">
                  {project.name}
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                  {project.projectCardDriveUrl === null ||
                  (project.status === "completed" &&
                    project.reportDriveUrl === null) ? (
                    <FileWarning
                      className="text-destructive size-4"
                      aria-label="Braki w dokumentacji projektu"
                    />
                  ) : null}
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {visibilityLabels[project.visibility]}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {project.startedAt === null
                  ? ""
                  : new Date(project.startedAt).toLocaleDateString("pl-PL")}
                {project.startedAt !== null && project.endedAt !== null
                  ? " – "
                  : ""}
                {project.endedAt === null
                  ? ""
                  : new Date(project.endedAt).toLocaleDateString("pl-PL")}
              </p>
            </Link>
          ))}
        </div>

        {paginated.length === 0 ? (
          <p className="text-muted-foreground rounded-md border p-4 text-sm">
            Brak projektów pasujących do filtrów.
          </p>
        ) : null}
      </div>

      <div className="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Wyniki {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filtered.length)} z{" "}
          {declineNumeric(filtered.length, "projekt", true)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
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
