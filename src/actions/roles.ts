"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";
import { roleAssignmentDraftSchema } from "@/lib/schemas/roles";
import type { RoleAssignmentDraft } from "@/lib/schemas/roles";

async function assertBoard() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!canManageMembers(permissions)) {
    throw new Error("Tylko zarząd może zarządzać rolami.");
  }
}

export async function assignRole(memberId: string, input: RoleAssignmentDraft) {
  await assertBoard();
  const values = roleAssignmentDraftSchema.parse(input);

  const role = await db.query.roleDefinition.findFirst({
    where: eq(roleDefinition.id, values.roleDefinitionId),
  });
  if (role === undefined) {
    throw new Error("Nie znaleziono roli.");
  }
  if (role.scope === "section" && values.sectionId === undefined) {
    throw new Error("Ta rola wymaga wskazania sekcji.");
  }
  if (role.scope === "project" && values.projectId === undefined) {
    throw new Error("Role projektowe są zarządzane w zespołach projektu.");
  }
  if (role.scope === "project") {
    throw new Error("Role projektowe są zarządzane w zespołach projektu.");
  }

  await db.insert(roleAssignment).values({
    memberId,
    roleDefinitionId: values.roleDefinitionId,
    sectionId: role.scope === "section" ? (values.sectionId ?? null) : null,
    projectId: null,
    startedAt: parseDate(values.startedAt) ?? new Date(),
    endedAt: parseDate(values.endedAt),
  });

  revalidatePath(`/members/${memberId}`);
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

export async function endRoleAssignment(roleAssignmentId: string) {
  await assertBoard();

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
