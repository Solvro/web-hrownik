import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { NewTeamForm } from "@/components/projects/new-team-form";
import { ProjectForm } from "@/components/projects/project-form";
import { TeamPanel } from "@/components/projects/team-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { project, projectStatus } from "@/db/schema/projects";
import { roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { canManageProject, getMemberPermissions } from "@/lib/permissions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.slug, slug),
    with: {
      repositories: true,
      roleAssignments: { with: { roleDefinition: true } },
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

  const statusHistory = await db.query.projectStatus.findMany({
    where: eq(projectStatus.projectId, projectRow.id),
    orderBy: (ps, { desc }) => desc(ps.createdAt),
  });

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !canManageProject(permissions, projectRow.id)) {
    return (
      <p className="text-muted-foreground">
        Brak uprawnień do edycji tego projektu.
      </p>
    );
  }

  const [members, projectRoleDefinitions, projectTeamRoleDefinitions] =
    await Promise.all([
      db.query.member.findMany({ orderBy: asc(member.fullName) }),
      db.query.roleDefinition.findMany({
        where: eq(roleDefinition.scope, "project"),
        orderBy: asc(roleDefinition.name),
      }),
      db.query.roleDefinition.findMany({
        where: eq(roleDefinition.scope, "project_team"),
        orderBy: asc(roleDefinition.name),
      }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold break-words">
        Edytuj: {projectRow.name}
      </h1>
      <ProjectForm
        mode="edit"
        projectId={projectRow.id}
        repoOptions={[]}
        statusHistory={statusHistory.map((entry) => ({
          id: entry.id,
          status: entry.status,
          createdAt: entry.createdAt,
        }))}
        memberOptions={members.map((memberRow) => ({
          id: memberRow.id,
          fullName: memberRow.fullName,
        }))}
        projectRoleDefinitions={projectRoleDefinitions.map((role) => ({
          id: role.id,
          name: role.name,
        }))}
        defaultValues={{
          name: projectRow.name,
          slug: projectRow.slug,
          status: projectRow.status,
          startedAt:
            projectRow.startedAt === null
              ? ""
              : toDateInput(projectRow.startedAt),
          visibility: projectRow.visibility,
          productionUrl: projectRow.productionUrl ?? "",
          driveFolderUrl: projectRow.driveFolderUrl ?? "",
          projectCardDriveUrl: projectRow.projectCardDriveUrl ?? "",
          reportDriveUrl: projectRow.reportDriveUrl ?? "",
          leaderboardLimit: projectRow.leaderboardLimit,
          leaderboardIncludeExternal: projectRow.leaderboardIncludeExternal,
          leaderboardIncludeBots: projectRow.leaderboardIncludeBots,
          repositoryFullNames: [],
          projectRoles: projectRow.roleAssignments
            .filter(
              (assignment) =>
                assignment.roleDefinition.scope === "project" &&
                assignment.projectId === projectRow.id,
            )
            .map((assignment) => ({
              memberId: assignment.memberId,
              roleDefinitionId: assignment.roleDefinitionId,
              startedAt: toDateInput(assignment.startedAt),
              endedAt:
                assignment.endedAt === null
                  ? ""
                  : toDateInput(assignment.endedAt),
            })),
        }}
      />
      <Card size="sm">
        <CardHeader>
          <CardTitle>Zespoły projektu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectRow.teams.map((teamRow) => (
            <div key={teamRow.id} className="space-y-2 rounded-md border p-3">
              <TeamPanel
                teamId={teamRow.id}
                teamName={teamRow.name}
                canManage
                roleDefinitions={projectTeamRoleDefinitions.map((role) => ({
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
                availableMembers={members.filter(
                  (memberRow) =>
                    !teamRow.members.some(
                      (teamMembership) =>
                        teamMembership.memberId === memberRow.id &&
                        teamMembership.leftAt === null,
                    ),
                )}
              />
            </div>
          ))}
          <NewTeamForm projectId={projectRow.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
