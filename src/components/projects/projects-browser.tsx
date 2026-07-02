"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListFilters } from "@/components/list-filters";
import {
  ProjectStatusBadge,
  projectStatusLabels,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
  name: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
}

const pageSizeOptions = [12, 24, 48] as const;

const visibilityLabels: Record<ProjectVisibility, string> = {
  internal: "wewnętrzny",
  public: "publiczny",
};

export function ProjectsBrowser({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortMode>("name-asc");
  const [pageSize, setPageSize] = useState<number>(12);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects
      .filter((project) => status === "all" || project.status === status)
      .filter(
        (project) => visibility === "all" || project.visibility === visibility,
      )
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
  }, [projects, query, sort, status, visibility]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <ListFilters
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            resetPage();
          }}
          queryPlaceholder="Szukaj po nazwie, statusie lub widoczności..."
          selects={[
            {
              value: status,
              onValueChange: (value) => {
                setStatus(value as StatusFilter);
                resetPage();
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
                resetPage();
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
              },
              placeholder: "Sortowanie",
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
            resetPage();
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="hover:bg-accent min-w-0 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 font-medium break-words">
                  {project.name}
                </h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {visibilityLabels[project.visibility]}
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
          {declineNumeric(filtered.length, "projekt")}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => {
              setPage((value) => Math.max(1, value - 1));
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
              setPage((value) => Math.min(pageCount, value + 1));
            }}
          >
            Następna
          </Button>
        </div>
      </div>
    </div>
  );
}
