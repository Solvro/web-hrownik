"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { teamMember } from "@/db/schema/projects";
import {
  roleAssignment,
  roleDefinition,
  roleDefinitionPermissionGroup,
} from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";
import type {
  RoleAssignmentDraft,
  RoleDefinitionFormValues,
} from "@/lib/schemas/roles";
import {
  roleAssignmentDraftSchema,
  roleDefinitionFormSchema,
} from "@/lib/schemas/roles";

async function assertCanManageRoles() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "roles", "write")) {
    throw new Error("Tylko zarząd może zarządzać rolami.");
  }
}

export async function assignRole(memberId: string, input: RoleAssignmentDraft) {
  await assertCanManageRoles();
  const values = roleAssignmentDraftSchema.parse(input);

  const role = await db.query.roleDefinition.findFirst({
    where: eq(roleDefinition.id, values.roleDefinitionId),
  });
  if (role === undefined) {
    throw new Error("Nie znaleziono roli.");
  }
  if (
    role.scope === "section" &&
    (values.sectionId === undefined || values.sectionId === "")
  ) {
    throw new Error("Ta rola wymaga wskazania sekcji.");
  }
  if (
    role.scope === "board" &&
    (values.boardTermId === undefined || values.boardTermId === "")
  ) {
    throw new Error("Ta rola wymaga wskazania kadencji zarządu.");
  }
  if (role.scope === "project_team" || role.scope === "project") {
    throw new Error("Role projektowe są zarządzane przy projekcie.");
  }

  await db.insert(roleAssignment).values({
    memberId,
    roleDefinitionId: values.roleDefinitionId,
    boardTermId: role.scope === "board" ? values.boardTermId : null,
    sectionId: role.scope === "section" ? values.sectionId : null,
    projectId: null,
    startedAt: parseDate(values.startedAt) ?? new Date(),
    endedAt: parseDate(values.endedAt),
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/boards");
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

export async function endRoleAssignment(roleAssignmentId: string) {
  await assertCanManageRoles();

  const assignment = await db.query.roleAssignment.findFirst({
    where: eq(roleAssignment.id, roleAssignmentId),
  });
  if (assignment === undefined) {
    throw new Error("Nie znaleziono przypisania roli.");
  }

  await db
    .update(roleAssignment)
    .set({ endedAt: new Date() })
    .where(eq(roleAssignment.id, roleAssignmentId));

  revalidatePath(`/members/${assignment.memberId}`);
}

export async function createRoleDefinition(input: RoleDefinitionFormValues) {
  await assertCanManageRoles();
  const values = roleDefinitionFormSchema.parse(input);

  const [created] = await db
    .insert(roleDefinition)
    .values({
      scope: values.scope,
      name: values.name,
      githubTeamSlug:
        values.githubTeamSlug === undefined || values.githubTeamSlug === ""
          ? null
          : values.githubTeamSlug,
      discordRoleId:
        values.discordRoleId === undefined || values.discordRoleId === ""
          ? null
          : values.discordRoleId,
    })
    .returning();

  if (values.permissionGroupIds.length > 0) {
    await db.insert(roleDefinitionPermissionGroup).values(
      values.permissionGroupIds.map((permissionGroupId) => ({
        roleDefinitionId: created.id,
        permissionGroupId,
      })),
    );
  }

  revalidatePath("/settings/roles");
}

export async function updateRoleDefinition(
  roleDefinitionId: string,
  input: RoleDefinitionFormValues,
) {
  await assertCanManageRoles();
  const values = roleDefinitionFormSchema.parse(input);

  await db
    .update(roleDefinition)
    .set({
      scope: values.scope,
      name: values.name,
      githubTeamSlug:
        values.githubTeamSlug === undefined || values.githubTeamSlug === ""
          ? null
          : values.githubTeamSlug,
      discordRoleId:
        values.discordRoleId === undefined || values.discordRoleId === ""
          ? null
          : values.discordRoleId,
    })
    .where(eq(roleDefinition.id, roleDefinitionId));

  await db
    .delete(roleDefinitionPermissionGroup)
    .where(
      eq(roleDefinitionPermissionGroup.roleDefinitionId, roleDefinitionId),
    );
  if (values.permissionGroupIds.length > 0) {
    await db.insert(roleDefinitionPermissionGroup).values(
      values.permissionGroupIds.map((permissionGroupId) => ({
        roleDefinitionId,
        permissionGroupId,
      })),
    );
  }

  revalidatePath("/settings/roles");
}

export async function deleteRoleDefinition(roleDefinitionId: string) {
  await assertCanManageRoles();

  const activeAssignments = await db
    .select({ id: roleAssignment.id })
    .from(roleAssignment)
    .where(
      and(
        eq(roleAssignment.roleDefinitionId, roleDefinitionId),
        isNull(roleAssignment.endedAt),
      ),
    )
    .limit(1);
  if (activeAssignments.length > 0) {
    throw new Error(
      "Nie można usunąć roli, która jest aktywnie przypisana do członka.",
    );
  }

  const activeTeamMembers = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(
      and(
        eq(teamMember.roleDefinitionId, roleDefinitionId),
        isNull(teamMember.leftAt),
      ),
    )
    .limit(1);
  if (activeTeamMembers.length > 0) {
    throw new Error(
      "Nie można usunąć roli, która jest aktywnie przypisana w zespole projektowym.",
    );
  }

  await db
    .delete(roleDefinitionPermissionGroup)
    .where(
      eq(roleDefinitionPermissionGroup.roleDefinitionId, roleDefinitionId),
    );
  await db
    .delete(roleDefinition)
    .where(eq(roleDefinition.id, roleDefinitionId));

  revalidatePath("/settings/roles");
}
