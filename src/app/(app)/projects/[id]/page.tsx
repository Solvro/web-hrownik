import { asc, desc, eq } from "drizzle-orm";
import { FileWarning, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProject } from "@/actions/projects";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DeleteButton } from "@/components/delete-button";
import { ContributorLeaderboardCard } from "@/components/projects/contributor-leaderboard";
import { NewTeamForm } from "@/components/projects/new-team-form";
import { ProjectActivityPanel } from "@/components/projects/project-activity-panel";
import { ProjectLinkPills } from "@/components/projects/project-link-pills";
import { TeamPanel } from "@/components/projects/team-panel";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project } from "@/db/schema/projects";
import { roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import {
  fallbackActivityTitle,
  getContributorRanking,
  getProjectDailyActivity,
} from "@/lib/integrations/github-activity";
import { can, canManageProject, getMemberPermissions } from "@/lib/permissions";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_PREVIEW_LIMIT = 5;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ingestActivity?: string }>;
}) {
  const { id: slug } = await params;
  const { ingestActivity } = await searchParams;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.slug, slug),
    with: {
      repositories: true,
      roleAssignments: { with: { member: true, roleDefinition: true } },
      teams: {
        with: {
          members: { with: { member: true, roleDefinition: true } },
          repositories: { with: { projectRepository: true } },
        },
      },
    },
  });
  if (projectRow === undefined) {
    notFound();
  }
  const projectId = projectRow.id;

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManage =
    permissions !== null && canManageProject(permissions, projectId);
  const canAddMembers =
    permissions !== null && can(permissions, "members", "write");
  const canDeleteProject =
    permissions !== null && can(permissions, "projects", "write");
  const [allMembers, projectRoleDefinitions] = await Promise.all([
    canManage
      ? db.query.member.findMany({ orderBy: asc(member.fullName) })
      : Promise.resolve([]),
    db.query.roleDefinition.findMany({
      where: eq(roleDefinition.scope, "project_team"),
      orderBy: asc(roleDefinition.name),
    }),
  ]);
  const activeProjectRoles = projectRow.roleAssignments.filter(
    (assignment) =>
      assignment.endedAt === null &&
      assignment.roleDefinition.scope === "project",
  );

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.projectId, projectId),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: RECENT_ACTIVITY_PREVIEW_LIMIT + 1,
    with: { member: true, projectRepository: true },
  });
  const hasMoreActivity = activityEvents.length > RECENT_ACTIVITY_PREVIEW_LIMIT;
  const recentActivity = activityEvents.slice(0, RECENT_ACTIVITY_PREVIEW_LIMIT);
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
  const unassignedActivityMemberById = new Map<
    string,
    NonNullable<(typeof activityEvents)[number]["member"]>
  >();
  for (const event of activityEvents) {
    if (event.member !== null && !activeProjectMemberIds.has(event.member.id)) {
      unassignedActivityMemberById.set(event.member.id, event.member);
    }
  }
  const unassignedActivityMembers = [...unassignedActivityMemberById.values()];

  const now = Date.now();
  const [weeklyRanking, monthlyRanking, allTimeRanking, dailyActivity] =
    await Promise.all([
      getContributorRanking(
        projectId,
        new Date(now - 7 * DAY_MS),
        projectRow.leaderboardLimit,
      ),
      getContributorRanking(
        projectId,
        new Date(now - 30 * DAY_MS),
        projectRow.leaderboardLimit,
      ),
      getContributorRanking(projectId, undefined, projectRow.leaderboardLimit),
      getProjectDailyActivity(projectId),
    ]);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold break-words">
              {projectRow.name}
            </h1>
            <ProjectStatusBadge status={projectRow.status} />
            {projectRow.startedAt === null ? (
              <a
                href={projectRow.projectCardDriveUrl ?? undefined}
                target={
                  projectRow.projectCardDriveUrl === null ? undefined : "_blank"
                }
                rel="noopener noreferrer"
                className="text-destructive hover:text-destructive/80"
                title={
                  projectRow.projectCardDriveUrl === null
                    ? "Brak daty rozpoczęcia"
                    : "Brak daty rozpoczęcia — otwórz kartę projektu"
                }
              >
                <FileWarning className="size-5" />
              </a>
            ) : null}
            {projectRow.projectCardDriveUrl === null ||
            (projectRow.status === "completed" &&
              projectRow.reportDriveUrl === null) ? (
              <FileWarning
                className="text-destructive size-5"
                aria-label="Braki w dokumentacji projektu"
              />
            ) : null}
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            {projectRow.visibility === "public" ? "publiczny" : "wewnętrzny"}
            {projectRow.startedAt === null ? null : (
              <span>
                · {new Date(projectRow.startedAt).toLocaleDateString("pl-PL")}
              </span>
            )}
            {projectRow.endedAt === null ? null : (
              <span>
                · {new Date(projectRow.endedAt).toLocaleDateString("pl-PL")}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[360px]:flex-row sm:flex-row">
          {canManage ? (
            <Button asChild variant="outline">
              <Link
                href={`/projects/${projectRow.slug}/edit`}
                transitionTypes={["nav-forward"]}
              >
                <Pencil />
                Edytuj
              </Link>
            </Button>
          ) : null}
          {canDeleteProject ? (
            <DeleteButton
              action={deleteProject.bind(null, projectId)}
              confirmMessage={`Na pewno usunąć projekt "${projectRow.name}"? Tej operacji nie można cofnąć.`}
            >
              Usuń projekt
            </DeleteButton>
          ) : null}
        </div>
      </div>

      <ProjectLinkPills
        productionUrl={projectRow.productionUrl}
        driveFolderUrl={projectRow.driveFolderUrl}
        reportUrl={
          projectRow.status === "completed"
            ? projectRow.reportDriveUrl
            : projectRow.projectCardDriveUrl
        }
        reportLabel={
          projectRow.status === "completed" ? "Sprawozdanie" : "Karta projektu"
        }
        repositories={projectRow.repositories.map((repo) => ({
          id: repo.id,
          label: repo.githubRepoFullName,
        }))}
        projectSlug={projectRow.slug}
      />

      <ContributorLeaderboardCard
        weekly={weeklyRanking}
        monthly={monthlyRanking}
        allTime={allTimeRanking}
        includeExternal={projectRow.leaderboardIncludeExternal}
        includeBots={projectRow.leaderboardIncludeBots}
        canAddMembers={canAddMembers}
      />

      {activeProjectRoles.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Role projektowe</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {activeProjectRoles.map((assignment) => (
                <li
                  key={assignment.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <Link
                    href={`/members/${assignment.member.id}`}
                    className="font-medium hover:underline"
                  >
                    {assignment.member.fullName}
                  </Link>
                  <div className="text-muted-foreground">
                    {assignment.roleDefinition.name}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <ProjectActivityPanel
          projectId={projectId}
          projectSlug={projectRow.slug}
          canManage={canManage}
          counts={dailyActivity}
          autoSync={canManage ? ingestActivity === "1" : false}
        />
        <Card size="sm">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Ostatnia aktywność</CardTitle>
              {hasMoreActivity ? (
                <Link
                  href={`/projects/${projectRow.slug}/activity`}
                  transitionTypes={["nav-forward"]}
                  className="text-sm hover:underline"
                >
                  Zobacz całą aktywność →
                </Link>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              items={recentActivity.map((event) => ({
                id: event.id,
                type: event.type,
                url: event.url,
                occurredAt: event.occurredAt,
                title: event.title ?? fallbackActivityTitle(event),
                actorName: event.member?.fullName ?? event.githubLogin,
                actorHref:
                  event.member === null
                    ? undefined
                    : `/members/${event.member.id}`,
                addMemberHref:
                  canAddMembers && event.member === null
                    ? `/members/new?githubUsername=${encodeURIComponent(event.githubLogin)}`
                    : undefined,
                assignToTeam:
                  canManage &&
                  event.member !== null &&
                  !activeProjectMemberIds.has(event.member.id)
                    ? {
                        projectId,
                        memberId: event.member.id,
                        teams: teamOptions,
                        roleDefinitions: projectRoleDefinitions.map((role) => ({
                          id: role.id,
                          name: role.name,
                        })),
                      }
                    : undefined,
                subtitle: event.projectRepository.githubRepoFullName,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {canManage && unassignedActivityMembers.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Kontrybutorzy bez zespołu</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {unassignedActivityMembers.map((memberRow) => (
                <li key={memberRow.id}>
                  <Link
                    href={`/members/${memberRow.id}`}
                    className="hover:underline"
                  >
                    {memberRow.fullName}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Zespoły</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectRow.teams.map((teamRow) => (
            <div key={teamRow.id} className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-medium">{teamRow.name}</h3>
              <TeamPanel
                teamId={teamRow.id}
                canManage={canManage}
                roleDefinitions={projectRoleDefinitions.map((role) => ({
                  id: role.id,
                  name: role.name,
                }))}
                members={teamRow.members.map((teamMembership) => ({
                  teamMemberId: teamMembership.id,
                  memberId: teamMembership.memberId,
                  fullName: teamMembership.member.fullName,
                  roleDefinitionId: teamMembership.roleDefinitionId,
                  roleDefinitionName: teamMembership.roleDefinition.name,
                  joinedAt: teamMembership.joinedAt,
                  leftAt: teamMembership.leftAt,
                }))}
                repositories={projectRow.repositories.map((repo) => ({
                  id: repo.id,
                  name: repo.githubRepoFullName,
                }))}
                selectedRepositoryIds={teamRow.repositories.map(
                  (repo) => repo.projectRepositoryId,
                )}
                availableMembers={
                  canManage
                    ? allMembers.filter(
                        (memberRow) =>
                          !teamRow.members.some(
                            (teamMembership) =>
                              teamMembership.memberId === memberRow.id &&
                              teamMembership.leftAt === null,
                          ),
                      )
                    : []
                }
              />
            </div>
          ))}
          {canManage ? <NewTeamForm projectId={projectId} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
