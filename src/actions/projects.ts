"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { db } from "@/db";
import { projectRepository, teamRepository } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project, team, teamMember } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { syncRepositories } from "@/lib/integrations/github-activity";
import type { SyncResult } from "@/lib/integrations/github-activity";
import { can, canManageProject, getMemberPermissions } from "@/lib/permissions";
import { projectFormSchema } from "@/lib/schemas/projects";
import type { ProjectFormValues } from "@/lib/schemas/projects";
import { grantTeamAccess, revokeTeamAccess } from "@/lib/team-sync";

const assignProjectMemberToTeamSchema = z.object({
  projectId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
  teamId: z.string().trim().min(1),
  newTeamName: z.string().trim().optional(),
  roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
});

export async function createProject(input: ProjectFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
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

  let linkedRepositoryCount = 0;
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
      linkedRepositoryCount = linkedRepos.length;
    }
  }

  redirect(
    `/projects/${created.id}${linkedRepositoryCount > 0 ? "?ingestActivity=1" : ""}`,
  );
}

export async function updateProject(
  projectId: string,
  input: ProjectFormValues,
) {
  await assertCanManageProject(projectId);

  const values = projectFormSchema.parse(input);

  await db
    .update(project)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId));

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function createTeam(projectId: string, name: string) {
  await assertCanManageProject(projectId);

  await db.insert(team).values({ projectId, name: name.trim() });
  revalidatePath(`/projects/${projectId}`);
}

export async function addTeamMember(
  teamId: string,
  memberId: string,
  roleDefinitionId: string,
) {
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

  await db.insert(teamMember).values({
    teamId,
    memberId,
    roleDefinitionId,
  });
  await grantTeamAccess(teamRow, memberRow);
  revalidatePath(`/projects/${teamRow.projectId}`);
}

export async function assignProjectMemberToTeam(
  input: z.input<typeof assignProjectMemberToTeamSchema>,
) {
  const values = assignProjectMemberToTeamSchema.parse(input);
  await assertCanManageProject(values.projectId);

  const memberRow = await db.query.member.findFirst({
    where: eq(member.id, values.memberId),
  });
  if (memberRow === undefined) {
    throw new Error("Nie znaleziono członka.");
  }

  const teamRow =
    values.teamId === "new"
      ? await createTeamForAssignment(values.projectId, values.newTeamName)
      : await db.query.team.findFirst({ where: eq(team.id, values.teamId) });
  if (teamRow?.projectId !== values.projectId) {
    throw new Error("Nie znaleziono zespołu w tym projekcie.");
  }

  await db.insert(teamMember).values({
    teamId: teamRow.id,
    memberId: memberRow.id,
    roleDefinitionId: values.roleDefinitionId,
  });
  await grantTeamAccess(teamRow, memberRow);

  revalidatePath(`/projects/${values.projectId}`);
  revalidatePath(`/projects/${values.projectId}/activity`);
}

export async function updateTeamMemberDetails(
  teamMemberId: string,
  input: { roleDefinitionId: string; joinedAt: string; leftAt: string },
) {
  const membership = await db.query.teamMember.findFirst({
    where: eq(teamMember.id, teamMemberId),
    with: { team: true, member: true },
  });
  if (membership === undefined) {
    throw new Error("Nie znaleziono członkostwa w zespole.");
  }
  await assertCanManageProject(membership.team.projectId);

  const joinedAt = parseDate(input.joinedAt);
  if (joinedAt === null) {
    throw new Error("Podaj datę dołączenia do zespołu.");
  }
  const leftAt = parseDate(input.leftAt);

  await db
    .update(teamMember)
    .set({
      roleDefinitionId: input.roleDefinitionId,
      joinedAt,
      leftAt,
    })
    .where(eq(teamMember.id, teamMemberId));

  if (membership.leftAt === null && leftAt !== null) {
    await revokeTeamAccess(membership.team, membership.member);
  }
  if (membership.leftAt !== null && leftAt === null) {
    await grantTeamAccess(membership.team, membership.member);
  }

  revalidatePath(`/projects/${membership.team.projectId}`);
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

  await db
    .update(teamMember)
    .set({ leftAt: new Date() })
    .where(eq(teamMember.id, teamMemberId));
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

export async function deleteProject(projectId: string) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    throw new Error("Tylko zarząd może usuwać projekty.");
  }

  const teams = await db.query.team.findMany({
    where: eq(team.projectId, projectId),
    with: {
      members: { where: isNull(teamMember.leftAt), with: { member: true } },
    },
  });
  for (const teamRow of teams) {
    for (const membership of teamRow.members) {
      await revokeTeamAccess(teamRow, membership.member);
    }
  }

  await db.delete(project).where(eq(project.id, projectId));

  revalidatePath("/projects");
  redirect("/projects");
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

async function createTeamForAssignment(
  projectId: string,
  name: string | undefined,
) {
  if (name === undefined || name.trim() === "") {
    throw new Error("Podaj nazwę nowego zespołu.");
  }
  const [created] = await db
    .insert(team)
    .values({ projectId, name: name.trim() })
    .returning();
  return created;
}

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}
