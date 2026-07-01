"use client";

import { useMemo, useState } from "react";

import { ListFilters } from "@/components/list-filters";
import { MemberCard } from "@/components/members/member-card";
import type { MemberCardData } from "@/components/members/member-card";
import type { MemberStatus } from "@/lib/schemas/members";

type StatusFilter = MemberStatus | "all";
type SortMode = "joined-desc" | "joined-asc" | "name-asc" | "name-desc";

export function SectionMembersBrowser({
  members,
}: {
  members: MemberCardData[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortMode>("joined-desc");

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members
      .filter((member) => status === "all" || member.status === status)
      .filter((member) => {
        if (normalizedQuery === "") {
          return true;
        }
        return [
          member.fullName,
          member.githubUsername ?? "",
          member.role ?? "",
          ...(member.projectBadges ?? []).map((project) => project.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .toSorted((first, second) => {
        if (sort === "name-asc") {
          return first.fullName.localeCompare(second.fullName, "pl");
        }
        if (sort === "name-desc") {
          return second.fullName.localeCompare(first.fullName, "pl");
        }
        const firstTime = first.joinedAt?.getTime() ?? 0;
        const secondTime = second.joinedAt?.getTime() ?? 0;
        return sort === "joined-desc"
          ? secondTime - firstTime
          : firstTime - secondTime;
      });
  }, [members, query, sort, status]);

  return (
    <div className="space-y-4">
      <ListFilters
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder="Szukaj po nazwie, GitHubie, roli lub projekcie..."
        selects={[
          {
            value: status,
            onValueChange: (value) => {
              setStatus(value as StatusFilter);
            },
            placeholder: "Status",
            options: [
              { value: "active", label: "aktywni" },
              { value: "new", label: "nowi" },
              { value: "inactive", label: "nieaktywni" },
              { value: "honorary", label: "honorowi" },
              { value: "all", label: "wszyscy" },
            ],
            className: "md:w-48",
          },
          {
            value: sort,
            onValueChange: (value) => {
              setSort(value as SortMode);
            },
            placeholder: "Sortowanie",
            options: [
              { value: "joined-desc", label: "najnowsi w sekcji" },
              { value: "joined-asc", label: "najstarsi w sekcji" },
              { value: "name-asc", label: "nazwa A-Z" },
              { value: "name-desc", label: "nazwa Z-A" },
            ],
            className: "md:w-56",
          },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
      {filteredMembers.length === 0 ? (
        <p className="text-muted-foreground rounded-md border p-4 text-sm">
          Brak członków pasujących do filtrów.
        </p>
      ) : null}
    </div>
  );
}
