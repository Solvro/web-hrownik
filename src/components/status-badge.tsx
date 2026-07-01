import { Badge } from "@/components/ui/badge";
import type { MemberStatus } from "@/lib/schemas/members";
import { cn } from "@/lib/utils";

type ProjectStatus = "active" | "completed" | "suspended";

export const memberStatusLabels: Record<MemberStatus, string> = {
  new: "nowy",
  active: "aktywny",
  inactive: "nieaktywny",
  honorary: "honorowy",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: "aktywny",
  completed: "zakończony",
  suspended: "zawieszony",
};

const memberStatusClassName: Record<MemberStatus, string> = {
  new: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300",
  active:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300",
  inactive:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
  honorary:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
};

const projectStatusClassName: Record<ProjectStatus, string> = {
  active:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300",
  completed:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
  suspended:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline" className={cn(memberStatusClassName[status])}>
      {memberStatusLabels[status]}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn(projectStatusClassName[status])}>
      {projectStatusLabels[status]}
    </Badge>
  );
}
