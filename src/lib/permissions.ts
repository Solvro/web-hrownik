import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { project, team, teamMember } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";

const projectLeadRoles = new Set(["pm", "po", "techlead", "ts"]);

export interface MemberPermissions {
  memberId: string;
  isBoard: boolean;
  leadProjectIds: string[];
}

export async function getMemberPermissions(
  memberId: string,
): Promise<MemberPermissions> {
  const [activeAssignments, activeProjectMemberships] = await Promise.all([
    db
      .select({
        permissionLevel: roleDefinition.permissionLevel,
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
      ),
    db
      .select({ projectId: project.id, role: teamMember.role })
      .from(teamMember)
      .innerJoin(team, eq(teamMember.teamId, team.id))
      .innerJoin(project, eq(team.projectId, project.id))
      .where(and(eq(teamMember.memberId, memberId), isNull(teamMember.leftAt))),
  ]);

  const isBoard = activeAssignments.some(
    (assignment) => assignment.permissionLevel === "board",
  );
  const leadProjectIds = activeProjectMemberships
    .filter((membership) => projectLeadRoles.has(membership.role.toLowerCase()))
    .map((membership) => membership.projectId);

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
