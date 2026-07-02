"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

export function MembersTable({ members }: { members: MembersTableRow[] }) {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [roleId, setRoleId] = useState("all");
  const [status, setStatus] = useState<MemberStatus | "all">("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

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
    return members.filter((memberRow) => {
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
        roleId === "all" || memberRow.roles.some((role) => role.id === roleId);
      const matchesStatus = status === "all" || memberRow.status === status;

      return matchesQuery && matchesSection && matchesRole && matchesStatus;
    });
  }, [members, query, roleId, sectionId, status]);

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
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <ListFilters
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            resetPage();
          }}
          queryPlaceholder="Szukaj po imieniu, nazwisku, GitHubie, sekcji lub roli…"
          selects={[
            {
              value: sectionId,
              onValueChange: (value) => {
                setSectionId(value);
                resetPage();
              },
              placeholder: "Sekcja",
              options: [
                { value: "all", label: "Wszystkie sekcje" },
                ...sectionOptions.map((section) => ({
                  value: section.id,
                  label: section.name,
                })),
              ],
            },
            {
              value: roleId,
              onValueChange: (value) => {
                setRoleId(value);
                resetPage();
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
                resetPage();
              },
              placeholder: "Status",
              options: [
                { value: "all", label: "Wszystkie statusy" },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
              className: "md:w-40",
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
            {paginated.map((memberRow) => (
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
                <TableCell>{memberRow.githubUsername ?? "—"}</TableCell>
                <TableCell>
                  <MemberStatusBadge status={memberRow.status} />
                </TableCell>
              </TableRow>
            ))}
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
