import { CircleDot, GitCommitHorizontal, GitPullRequest } from "lucide-react";
import type { ReactNode } from "react";

export interface ActivityTimelineItem {
  id: string;
  type: "commit" | "pull_request" | "issue";
  url: string;
  occurredAt: Date;
  githubLogin: string;
  trailing?: ReactNode;
}

const typeIcon = {
  commit: GitCommitHorizontal,
  pull_request: GitPullRequest,
  issue: CircleDot,
} as const;

export function ActivityTimeline({ items }: { items: ActivityTimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Brak aktywności.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const Icon = typeIcon[item.type];
        return (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <Icon className="text-muted-foreground size-4 shrink-0" />
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:underline"
            >
              {item.githubLogin}
            </a>
            {item.trailing}
            <span className="text-muted-foreground ml-auto shrink-0 text-xs">
              {item.occurredAt.toLocaleDateString("pl-PL")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
