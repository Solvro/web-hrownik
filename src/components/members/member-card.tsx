import { AtSign, CalendarDays } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { MemberStatus } from "@/lib/schemas/members";

export const memberStatusLabels: Record<MemberStatus, string> = {
  new: "nowy",
  active: "aktywny",
  inactive: "nieaktywny",
  honorary: "honorowy",
};

export interface MemberCardData {
  id: string;
  fullName: string;
  githubUsername: string | null;
  status: MemberStatus;
  joinedAt?: Date;
  role?: string | null;
  projectBadges?: { id: string; name: string }[];
}

export function MemberCard({ member }: { member: MemberCardData }) {
  return (
    <article className="bg-card text-card-foreground hover:border-primary/40 rounded-xl border p-4 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/members/${member.id}`}
            className="block truncate font-medium hover:underline"
          >
            {member.fullName}
          </Link>
          {member.githubUsername === null ? null : (
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <AtSign className="size-3.5" />
              {member.githubUsername}
            </p>
          )}
        </div>
        <Badge
          variant={
            member.status === "active" || member.status === "new"
              ? "default"
              : "secondary"
          }
        >
          {memberStatusLabels[member.status]}
        </Badge>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-sm">
        {member.joinedAt === undefined ? null : (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            od {member.joinedAt.toLocaleDateString("pl-PL")}
          </span>
        )}
        {member.role === undefined || member.role === null ? null : (
          <Badge variant="outline">{member.role}</Badge>
        )}
      </div>

      {member.projectBadges === undefined ||
      member.projectBadges.length === 0 ? null : (
        <div className="mt-3 flex flex-wrap gap-1">
          {member.projectBadges.map((project) => (
            <Badge key={project.id} variant="secondary">
              {project.name}
            </Badge>
          ))}
        </div>
      )}
    </article>
  );
}
