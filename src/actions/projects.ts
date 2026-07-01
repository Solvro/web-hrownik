"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { db } from "@/db";
import { projectRepository, teamRepository } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project, team, teamMember } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { syncRepositories } from "@/lib/integrations/github-activity";
import type { SyncResult } from "@/lib/integrations/github-activity";
import { canManageProject, getMemberPermissions } from "@/lib/permissions";
import { projectFormSchema } from "@/lib/schemas/projects";
import type { ProjectFormValues } from "@/lib/schemas/projects";
import { grantTeamAccess, revokeTeamAccess } from "@/lib/team-sync";

export async function createProject(input: ProjectFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!permissions.isBoard) {
    throw new Error("Tylko zarząd może tworzyć projekty.");
  }

  const values = projectFormSchema.parse(input);

  const [created] = await db
    .insert(project)
    .values({
      name: values.name,
      slug: values.slug,
      status: values.status,
      visibility: values.visibility,
      productionUrl: emptyToNull(values.productionUrl),
      driveFolderUrl: emptyToNull(values.driveFolderUrl),
      projectCardDriveUrl: emptyToNull(values.projectCardDriveUrl),
      reportDriveUrl:
        values.status === "completed"
          ? emptyToNull(values.reportDriveUrl)
          : null,
    })
    .returning();

  if (values.repositoryFullNames.length > 0) {
    const orgRepos = await listOrgRepos();
    const reposByFullName = new Map(
      orgRepos.map((repo) => [repo.fullName, repo]),
    );
    const matched = values.repositoryFullNames
      .map((fullName) => reposByFullName.get(fullName))
      .filter((repo) => repo !== undefined);

    if (matched.length > 0) {
      const linkedRepos = await db
        .insert(projectRepository)
        .values(
          matched.map((repo) => ({
            projectId: created.id,
            githubRepoFullName: repo.fullName,
            githubRepoId: String(repo.id),
          })),
        )
        .returning();

      // Historical activity for a freshly linked repo only exists via REST
      // backfill — going forward, /api/webhooks/github keeps it current.
      // Scheduled after the response so project creation isn't slowed down.
      after(syncRepositories(linkedRepos));
    }
  }

  redirect(`/projects/${created.id}`);
}

export async function createTeam(projectId: string, name: string) {
  await assertCanManageProject(projectId);

  await db.insert(team).values({ projectId, name: name.trim() });
  revalidatePath(`/projects/${projectId}`);
}

export async function addTeamMember(teamId: string, memberId: string) {
  const teamRow = await db.query.team.findFirst({ where: eq(team.id, teamId) });
  if (teamRow === undefined) {
    throw new Error("Nie znaleziono zespołu.");
  }
  await assertCanManageProject(teamRow.projectId);

  const memberRow = await db.query.member.findFirst({
    where: eq(member.id, memberId),
  });
  if (memberRow === undefined) {
    throw new Error("Nie znaleziono członka.");
  }

  await db.insert(teamMember).values({ teamId, memberId });
  await grantTeamAccess(teamRow, memberRow);
  revalidatePath(`/projects/${teamRow.projectId}`);
}

export async function removeTeamMember(teamMemberId: string) {
  const membership = await db.query.teamMember.findFirst({
    where: eq(teamMember.id, teamMemberId),
    with: { team: true, member: true },
  });
  if (membership === undefined) {
    throw new Error("Nie znaleziono członkostwa w zespole.");
  }
  await assertCanManageProject(membership.team.projectId);

  await db.delete(teamMember).where(eq(teamMember.id, teamMemberId));
  await revokeTeamAccess(membership.team, membership.member);
  revalidatePath(`/projects/${membership.team.projectId}`);
}

export async function updateTeamRepositories(
  teamId: string,
  projectRepositoryIds: string[],
) {
  const teamRow = await db.query.team.findFirst({ where: eq(team.id, teamId) });
  if (teamRow === undefined) {
    throw new Error("Nie znaleziono zespołu.");
  }
  await assertCanManageProject(teamRow.projectId);

  await db.delete(teamRepository).where(eq(teamRepository.teamId, teamId));
  if (projectRepositoryIds.length > 0) {
    const repos = await db.query.projectRepository.findMany({
      where: and(
        eq(projectRepository.projectId, teamRow.projectId),
        inArray(projectRepository.id, projectRepositoryIds),
      ),
    });
    if (repos.length > 0) {
      await db.insert(teamRepository).values(
        repos.map((repo) => ({
          teamId,
          projectRepositoryId: repo.id,
        })),
      );
    }
  }
  revalidatePath(`/projects/${teamRow.projectId}`);
}

export async function assignProjectRole(
  projectId: string,
  memberId: string,
  roleName: "PM" | "PO",
) {
  await assertCanManageProject(projectId);
  const definition = await db.query.roleDefinition.findFirst({
    where: and(
      eq(roleDefinition.scope, "project"),
      eq(roleDefinition.name, roleName),
    ),
  });
  if (definition === undefined) {
    throw new Error(`Nie znaleziono roli ${roleName}.`);
  }

  await db.insert(roleAssignment).values({
    memberId,
    projectId,
    roleDefinitionId: definition.id,
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Manual "Synchronizuj aktywność" button — initial data collection or a
 * one-off catch-up, on top of the ongoing webhook-driven sync. */
export async function syncProjectActivity(
  projectId: string,
): Promise<SyncResult[]> {
  await assertCanManageProject(projectId);

  const repos = await db.query.projectRepository.findMany({
    where: eq(projectRepository.projectId, projectId),
  });
  const results = await syncRepositories(repos);
  revalidatePath(`/projects/${projectId}`);
  return results;
}

async function assertCanManageProject(projectId: string) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!canManageProject(permissions, projectId)) {
    throw new Error("Brak uprawnień do zarządzania tym projektem.");
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}
