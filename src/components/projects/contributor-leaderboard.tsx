"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  memberId: string | null;
  fullName: string | null;
  githubLogin: string;
  eventCount: number;
}

const RANK_STYLE = [
  "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400",
  "bg-zinc-400/20 text-zinc-600 dark:text-zinc-300",
  "bg-orange-400/20 text-orange-700 dark:text-orange-400",
] as const;

function initials(entry: LeaderboardEntry): string {
  const source = entry.fullName ?? entry.githubLogin;
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function LeaderboardRow({
  entry,
  rank,
  share,
  canAddMembers,
}: {
  entry: LeaderboardEntry;
  rank: number;
  share: number;
  canAddMembers: boolean;
}) {
  const name = entry.fullName ?? entry.githubLogin;

  return (
    <li className="relative overflow-hidden rounded-lg">
      <div
        className="bg-primary/10 absolute inset-y-0 left-0 rounded-lg"
        style={{ width: `${String(share)}%` }}
      />
      <div className="relative flex items-center gap-3 px-2 py-1.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            RANK_STYLE[rank - 1] ?? "text-muted-foreground",
          )}
        >
          {rank}
        </span>
        <Avatar size="sm">
          <AvatarFallback>{initials(entry)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 truncate text-sm">
          {entry.memberId === null ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{name}</span>
              {canAddMembers ? (
                <Link
                  href={`/members/new?githubUsername=${encodeURIComponent(entry.githubLogin)}`}
                  className="shrink-0 text-xs underline"
                >
                  Dodaj członka
                </Link>
              ) : null}
            </span>
          ) : (
            <Link
              href={`/members/${entry.memberId}`}
              className="truncate hover:underline"
            >
              {name}
            </Link>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 text-sm font-medium tabular-nums">
          {entry.eventCount}
        </span>
      </div>
    </li>
  );
}

function LeaderboardList({
  entries,
  canAddMembers,
}: {
  entries: LeaderboardEntry[];
  canAddMembers: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Brak aktywności w tym okresie.
      </p>
    );
  }

  const maxCount = Math.max(...entries.map((entry) => entry.eventCount));

  return (
    <ol className="space-y-1">
      {entries.map((entry, index) => (
        <LeaderboardRow
          key={entry.memberId ?? entry.githubLogin}
          entry={entry}
          rank={index + 1}
          share={maxCount === 0 ? 0 : (entry.eventCount / maxCount) * 100}
          canAddMembers={canAddMembers}
        />
      ))}
    </ol>
  );
}

export function ContributorLeaderboardCard({
  weekly,
  monthly,
  allTime,
  canAddMembers,
}: {
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  canAddMembers: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-muted-foreground size-4" />
          Top kontrybutorzy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week">Tydzień</TabsTrigger>
            <TabsTrigger value="month">Miesiąc</TabsTrigger>
            <TabsTrigger value="all">Cały czas</TabsTrigger>
          </TabsList>
          <TabsContent value="week">
            <LeaderboardList entries={weekly} canAddMembers={canAddMembers} />
          </TabsContent>
          <TabsContent value="month">
            <LeaderboardList entries={monthly} canAddMembers={canAddMembers} />
          </TabsContent>
          <TabsContent value="all">
            <LeaderboardList entries={allTime} canAddMembers={canAddMembers} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
