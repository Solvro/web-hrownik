"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberStatus } from "@/lib/schemas/members";

const memberStatusLabels: Record<MemberStatus, string> = {
  new: "nowy",
  active: "aktywny",
  inactive: "nieaktywny",
  honorary: "honorowy",
};

export interface MembersTableRow {
  id: string;
  fullName: string;
  githubUsername: string | null;
  status: MemberStatus;
  sections: { id: string; name: string }[];
}

export function MembersTable({ members }: { members: MembersTableRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === "") {
      return members;
    }
    return members.filter(
      (memberRow) =>
        memberRow.fullName.toLowerCase().includes(normalizedQuery) ||
        (memberRow.githubUsername?.toLowerCase().includes(normalizedQuery) ??
          false) ||
        memberRow.sections.some((section) =>
          section.name.toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [members, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        placeholder="Szukaj po imieniu, nazwisku, GitHubie lub sekcji…"
        className="max-w-sm"
      />

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
          {filtered.map((memberRow) => (
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
                <Badge
                  variant={
                    memberRow.status === "active" || memberRow.status === "new"
                      ? "default"
                      : "secondary"
                  }
                >
                  {memberStatusLabels[memberRow.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 ? (
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
  );
}
