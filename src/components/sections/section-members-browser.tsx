"use client";

import { useMemo, useState } from "react";

import { MemberCard } from "@/components/members/member-card";
import type { MemberCardData } from "@/components/members/member-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <div className="grid gap-2 md:grid-cols-[1fr_12rem_14rem]">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Szukaj po nazwie, GitHubie, roli lub projekcie..."
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">aktywni</SelectItem>
            <SelectItem value="new">nowi</SelectItem>
            <SelectItem value="inactive">nieaktywni</SelectItem>
            <SelectItem value="honorary">honorowi</SelectItem>
            <SelectItem value="all">wszyscy</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as SortMode);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="joined-desc">najnowsi w sekcji</SelectItem>
            <SelectItem value="joined-asc">najstarsi w sekcji</SelectItem>
            <SelectItem value="name-asc">nazwa A-Z</SelectItem>
            <SelectItem value="name-desc">nazwa Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
