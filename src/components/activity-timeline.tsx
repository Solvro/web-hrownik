import { UserPlus } from "lucide-react";
import Link from "next/link";

import { AssignActivityMemberToTeam } from "@/components/projects/assign-activity-member-to-team";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

export interface ActivityTimelineItem {
  id: string;
  type: "commit" | "pull_request" | "issue";
  url: string;
  title: string;
  subtitle: string;
  actorName?: string;
  actorHref?: string;
  addMemberHref?: string;
  assignToTeam?: {
    projectId: string;
    memberId: string;
    teams: { id: string; name: string }[];
  };
  occurredAt: Date;
}

const TYPE_DOT_CLASS = {
  commit: "bg-sky-500",
  pull_request: "bg-violet-500",
  issue: "bg-emerald-500",
} as const;

export function ActivityTimeline({ items }: { items: ActivityTimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Brak aktywności.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-2.5">
          <span
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              TYPE_DOT_CLASS[item.type],
            )}
          />
          <div className="min-w-0 flex-1">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm hover:underline"
            >
              {item.title}
            </a>
            <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
              <p className="truncate">
                {item.actorName === undefined ? null : item.actorHref ===
                  undefined ? (
                  item.actorName
                ) : (
                  <Link href={item.actorHref} className="hover:underline">
                    {item.actorName}
                  </Link>
                )}
                {item.actorName === undefined
                  ? item.subtitle
                  : ` · ${item.subtitle}`}
              </p>
              {item.addMemberHref === undefined ? null : (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-6 shrink-0 px-2"
                >
                  <Link href={item.addMemberHref}>
                    <UserPlus />
                    Dodaj członka
                  </Link>
                </Button>
              )}
              {item.assignToTeam === undefined ? null : (
                <AssignActivityMemberToTeam {...item.assignToTeam} />
              )}
            </div>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatRelativeTime(item.occurredAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
