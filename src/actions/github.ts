"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { projectRepository, teamRepository } from "@/db/schema/github";
import { team } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";

export async function linkRepoToProject(
  githubRepoFullName: string,
  projectId: string,
) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    throw new Error("Tylko zarząd może zarządzać repozytoriami.");
  }

  const existing = await db.query.projectRepository.findFirst({
    where: eq(projectRepository.githubRepoFullName, githubRepoFullName),
  });
  if (existing !== undefined) {
    throw new Error("Repozytorium jest już przypisane do projektu.");
  }

  const orgRepos = await listOrgRepos();
  const orgRepo = orgRepos.find((r) => r.fullName === githubRepoFullName);
  const githubRepoId = orgRepo === undefined ? "0" : String(orgRepo.id);

  await db.insert(projectRepository).values({
    projectId,
    githubRepoFullName,
    githubRepoId,
  });

  revalidatePath("/settings/github");
  revalidatePath(`/settings/github/repositories`);
}

export async function linkRepoToProjectAndTeam(
  githubRepoFullName: string,
  projectId: string,
  teamId: string,
) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    throw new Error("Tylko zarząd może zarządzać repozytoriami.");
  }

  const existing = await db.query.projectRepository.findFirst({
    where: eq(projectRepository.githubRepoFullName, githubRepoFullName),
  });
  if (existing !== undefined) {
    throw new Error("Repozytorium jest już przypisane do projektu.");
  }

  const teamRow = await db.query.team.findFirst({
    where: eq(team.id, teamId),
  });
  if (teamRow === undefined) {
    throw new Error("Nie znaleziono zespołu.");
  }

  const orgRepos = await listOrgRepos();
  const orgRepo = orgRepos.find((r) => r.fullName === githubRepoFullName);
  const githubRepoId = orgRepo === undefined ? "0" : String(orgRepo.id);

  const [created] = await db
    .insert(projectRepository)
    .values({
      projectId,
      githubRepoFullName,
      githubRepoId,
    })
    .returning();

  await db.insert(teamRepository).values({
    teamId,
    projectRepositoryId: created.id,
  });

  revalidatePath("/settings/github");
  revalidatePath(`/settings/github/repositories`);
  revalidatePath(`/settings/github/project-repos`);
}
