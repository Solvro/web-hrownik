"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    (searchParameters.get("status") as StatusFilter | null) ?? "active",
  );
  const [sort, setSort] = useState<SortMode>(
    (searchParameters.get("sort") as SortMode | null) ?? "joined-desc",
  );

  function updateUrl(updates: Record<string, string>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const isDefault =
        (key === "q" && value === "") ||
        (key === "status" && value === "active") ||
        (key === "sort" && value === "joined-desc");
      if (isDefault) {
        parameters.delete(key);
      } else {
        parameters.set(key, value);
      }
    }
    router.replace(
      parameters.size === 0 ? pathname : `${pathname}?${parameters.toString()}`,
      { scroll: false },
    );
  }

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
        onQueryChange={(value) => {
          setQuery(value);
          updateUrl({ q: value });
        }}
        queryPlaceholder="Szukaj po nazwie, GitHubie, roli lub projekcie..."
        selects={[
          {
            value: status,
            onValueChange: (value) => {
              setStatus(value as StatusFilter);
              updateUrl({ status: value });
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
              updateUrl({ sort: value });
            },
            placeholder: "Sortowanie",
            kind: "sort",
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
