import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/activity-timeline";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { project } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { fallbackActivityTitle } from "@/lib/integrations/github-activity";
import {
  canManageMembers,
  canManageProject,
  getMemberPermissions,
} from "@/lib/permissions";

const ACTIVITY_LIMIT = 200;

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, id),
    columns: { id: true, name: true },
    with: { teams: { with: { members: true } } },
  });
  if (projectRow === undefined) {
    notFound();
  }

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.projectId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: ACTIVITY_LIMIT,
    with: { member: true, projectRepository: true },
  });
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canAddMembers = permissions !== null && canManageMembers(permissions);
  const canManage = permissions !== null && canManageProject(permissions, id);
  const teamOptions = projectRow.teams.map((teamRow) => ({
    id: teamRow.id,
    name: teamRow.name,
  }));
  const activeProjectMemberIds = new Set(
    projectRow.teams.flatMap((teamRow) =>
      teamRow.members
        .filter((teamMembership) => teamMembership.leftAt === null)
        .map((teamMembership) => teamMembership.memberId),
    ),
  );

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link
          href={`/projects/${id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {projectRow.name}
        </Link>
        <h1 className="text-2xl font-semibold">Aktywność</h1>
      </div>
      <ActivityTimeline
        items={activityEvents.map((event) => ({
          id: event.id,
          type: event.type,
          url: event.url,
          occurredAt: event.occurredAt,
          title: event.title ?? fallbackActivityTitle(event),
          subtitle: event.projectRepository.githubRepoFullName,
          actorName: event.member?.fullName ?? event.githubLogin,
          actorHref:
            event.member === null ? undefined : `/members/${event.member.id}`,
          addMemberHref:
            canAddMembers && event.member === null
              ? `/members/new?githubUsername=${encodeURIComponent(event.githubLogin)}`
              : undefined,
          assignToTeam:
            canManage &&
            event.member !== null &&
            !activeProjectMemberIds.has(event.member.id)
              ? {
                  projectId: id,
                  memberId: event.member.id,
                  teams: teamOptions,
                }
              : undefined,
        }))}
      />
    </div>
  );
}
