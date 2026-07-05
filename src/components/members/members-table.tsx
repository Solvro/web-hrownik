"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ListFilters } from "@/components/list-filters";
import { MemberStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { declineNumeric } from "@/lib/polish";
import type { MemberStatus } from "@/lib/schemas/members";

export interface MembersTableRow {
  id: string;
  fullName: string;
  githubUsername: string | null;
  status: MemberStatus;
  sections: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

const statusLabels: Record<MemberStatus, string> = {
  new: "Nowy",
  active: "Aktywny",
  inactive: "Nieaktywny",
  honorary: "Honorowy",
};

const pageSizeOptions = [10, 25, 50, 100] as const;
type SortMode = "name-asc" | "name-desc" | "status-asc";

const defaultPageSize = 25;

export function MembersTable({ members }: { members: MembersTableRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [sectionId, setSectionId] = useState(
    searchParameters.get("section") ?? "all",
  );
  const [roleId, setRoleId] = useState(searchParameters.get("role") ?? "all");
  const [status, setStatus] = useState<MemberStatus | "all">(
    (searchParameters.get("status") as MemberStatus | "all" | null) ?? "all",
  );
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
  const [githubFilter, setGithubFilter] = useState<"all" | "invalid">(
    (searchParameters.get("github") as "all" | "invalid" | null) ?? "all",
  );
  const [invalidGithubIds, setInvalidGithubIds] = useState<
    Set<string> | undefined
  >();

  useEffect(() => {
    if (searchParameters.has("pageSize")) {
      return;
    }
    const stored = Number(localStorage.getItem("members-page-size"));
    if (Number.isFinite(stored) && stored > 0) {
      setPageSize(stored);
    }
  }, [searchParameters]);

  useEffect(() => {
    async function fetchInvalidIds() {
      try {
        const response = await fetch("/api/members/github-validation");
        const { invalidIds } = await (response.json() as Promise<{
          invalidIds: string[];
        }>);
        setInvalidGithubIds(new Set(invalidIds));
      } catch {
        /* ignore */
      }
    }
    void fetchInvalidIds();
  }, []);

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      const isDefault =
        (key === "q" && stringValue === "") ||
        (["section", "role", "status", "github"].includes(key) &&
          stringValue === "all") ||
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

  const sectionOptions = useMemo(
    () =>
      members
        .flatMap((memberRow) => memberRow.sections)
        .filter(
          (section, index, sections) =>
            sections.findIndex((item) => item.id === section.id) === index,
        )
        .toSorted((a, b) => a.name.localeCompare(b.name, "pl")),
    [members],
  );

  const roleOptions = useMemo(
    () =>
      members
        .flatMap((memberRow) => memberRow.roles)
        .filter(
          (role, index, roles) =>
            roles.findIndex((item) => item.id === role.id) === index,
        )
        .toSorted((a, b) => a.name.localeCompare(b.name, "pl")),
    [members],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members
      .filter((memberRow) => {
        const matchesQuery =
          normalizedQuery === "" ||
          memberRow.fullName.toLowerCase().includes(normalizedQuery) ||
          (memberRow.githubUsername?.toLowerCase().includes(normalizedQuery) ??
            false) ||
          memberRow.sections.some((section) =>
            section.name.toLowerCase().includes(normalizedQuery),
          ) ||
          memberRow.roles.some((role) =>
            role.name.toLowerCase().includes(normalizedQuery),
          );
        const matchesSection =
          sectionId === "all" ||
          memberRow.sections.some((section) => section.id === sectionId);
        const matchesRole =
          roleId === "all" ||
          memberRow.roles.some((role) => role.id === roleId);
        const matchesStatus = status === "all" || memberRow.status === status;
        const matchesGithub =
          githubFilter === "all" ||
          (invalidGithubIds?.has(memberRow.id) ?? false);

        return (
          matchesQuery &&
          matchesSection &&
          matchesRole &&
          matchesStatus &&
          matchesGithub
        );
      })
      .toSorted((first, second) => {
        if (sort === "name-desc") {
          return second.fullName.localeCompare(first.fullName, "pl");
        }
        if (sort === "status-asc") {
          return statusLabels[first.status].localeCompare(
            statusLabels[second.status],
            "pl",
          );
        }
        return first.fullName.localeCompare(second.fullName, "pl");
      });
  }, [
    members,
    query,
    roleId,
    sectionId,
    sort,
    status,
    githubFilter,
    invalidGithubIds,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <ListFilters
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
            updateUrl({ q: value, page: 1 });
          }}
          queryPlaceholder="Szukaj po imieniu, nazwisku, GitHubie, sekcji lub roli…"
          className="min-w-0 flex-1 md:flex-wrap"
          selects={[
            {
              value: sectionId,
              onValueChange: (value) => {
                setSectionId(value);
                setPage(1);
                updateUrl({ section: value, page: 1 });
              },
              placeholder: "Sekcja",
              options: [
                { value: "all", label: "Wszystkie sekcje" },
                ...sectionOptions.map((section) => ({
                  value: section.id,
                  label: section.name,
                })),
              ],
              className: "md:w-52",
            },
            {
              value: roleId,
              onValueChange: (value) => {
                setRoleId(value);
                setPage(1);
                updateUrl({ role: value, page: 1 });
              },
              placeholder: "Rola",
              options: [
                { value: "all", label: "Wszystkie role" },
                ...roleOptions.map((role) => ({
                  value: role.id,
                  label: role.name,
                })),
              ],
            },
            {
              value: status,
              onValueChange: (value) => {
                setStatus(value as MemberStatus | "all");
                setPage(1);
                updateUrl({ status: value, page: 1 });
              },
              placeholder: "Status",
              options: [
                { value: "all", label: "Wszystkie statusy" },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
              className: "md:w-44",
            },
            {
              value: githubFilter,
              onValueChange: (value) => {
                setGithubFilter(value as "all" | "invalid");
                setPage(1);
                updateUrl({ github: value, page: 1 });
              },
              placeholder: "GitHub",
              options: [
                { value: "all", label: "Wszystkie konta" },
                { value: "invalid", label: "Nieprawidłowe konto" },
              ],
              className: "md:w-56",
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
              ],
              className: "md:w-44",
            },
          ]}
        />
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            localStorage.setItem("members-page-size", value);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Sekcje</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((memberRow) => {
              const githubUsernameInvalid =
                invalidGithubIds?.has(memberRow.id) ?? false;
              return (
                <TableRow key={memberRow.id}>
                  <TableCell>
                    <Link
                      href={`/members/${memberRow.id}`}
                      className="font-medium hover:underline"
                    >
                      {memberRow.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {memberRow.sections.map((section) => (
                        <Badge key={section.id} variant="outline">
                          {section.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {memberRow.githubUsername === null ? (
                      "—"
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <a
                          href={`https://github.com/${memberRow.githubUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {memberRow.githubUsername}
                        </a>
                        {githubUsernameInvalid ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TriangleAlert className="text-destructive size-4 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Konto GitHub nie istnieje</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <MemberStatusBadge status={memberRow.status} />
                  </TableCell>
                </TableRow>
              );
            })}
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground text-center"
                >
                  Brak wyników.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Wyniki {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filtered.length)} z{" "}
          {declineNumeric(filtered.length, "członek", true)}
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
