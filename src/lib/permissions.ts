import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";

export interface MemberPermissions {
  memberId: string;
  isBoard: boolean;
  leadProjectIds: string[];
}

export async function getMemberPermissions(
  memberId: string,
): Promise<MemberPermissions> {
  const activeAssignments = await db
    .select({
      permissionLevel: roleDefinition.permissionLevel,
      projectId: roleAssignment.projectId,
    })
    .from(roleAssignment)
    .innerJoin(
      roleDefinition,
      eq(roleAssignment.roleDefinitionId, roleDefinition.id),
    )
    .where(
      and(
        eq(roleAssignment.memberId, memberId),
        isNull(roleAssignment.endedAt),
      ),
    );

  const isBoard = activeAssignments.some(
    (assignment) => assignment.permissionLevel === "board",
  );
  const leadProjectIds = activeAssignments
    .filter(
      (assignment): assignment is typeof assignment & { projectId: string } =>
        assignment.permissionLevel === "project_lead" &&
        assignment.projectId !== null,
    )
    .map((assignment) => assignment.projectId);

  return { memberId, isBoard, leadProjectIds };
}

/** Board manages the member directory: onboarding, full profile edits, role assignment. */
export function canManageMembers(permissions: MemberPermissions): boolean {
  return permissions.isBoard;
}

/** Board and the project's own leads manage that project's attributes, repos and teams. */
export function canManageProject(
  permissions: MemberPermissions,
  projectId: string,
): boolean {
  return permissions.isBoard || permissions.leadProjectIds.includes(projectId);
}

/** Every member may edit their own socials and study data, regardless of role. */
export function canEditOwnProfile(
  permissions: MemberPermissions,
  targetMemberId: string,
): boolean {
  return permissions.memberId === targetMemberId;
}
