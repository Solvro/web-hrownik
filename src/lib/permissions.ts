import { and, eq, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { boardSettings } from "@/db/schema/boards";
import { project, team, teamMember } from "@/db/schema/projects";
import {
  permissionGrant,
  permissionGroup,
  roleAssignment,
  roleDefinition,
  roleDefinitionPermissionGroup,
} from "@/db/schema/roles";

import type { PermissionResourceKey } from "./permissions/catalog";
import { grantKey } from "./permissions/catalog";

export interface MemberPermissions {
  memberId: string;
  grants: Set<string>;
  leadProjectIds: string[];
}

export const getMemberPermissions = cache(
  async (memberId: string): Promise<MemberPermissions> => {
    const [grantRows, leadProjectRows] = await Promise.all([
      db
        .select({
          resource: permissionGrant.resource,
          action: permissionGrant.action,
        })
        .from(roleAssignment)
        .innerJoin(
          roleDefinition,
          eq(roleAssignment.roleDefinitionId, roleDefinition.id),
        )
        .innerJoin(
          roleDefinitionPermissionGroup,
          eq(roleDefinitionPermissionGroup.roleDefinitionId, roleDefinition.id),
        )
        .innerJoin(
          permissionGroup,
          eq(
            permissionGroup.id,
            roleDefinitionPermissionGroup.permissionGroupId,
          ),
        )
        .innerJoin(
          permissionGrant,
          eq(permissionGrant.permissionGroupId, permissionGroup.id),
        )
        .where(
          and(
            eq(roleAssignment.memberId, memberId),
            isNull(roleAssignment.endedAt),
            or(
              sql`${roleDefinition.scope} <> 'board'`,
              sql`${roleAssignment.boardTermId} = (SELECT ${boardSettings.activeBoardTermId} FROM ${boardSettings} WHERE ${boardSettings.id} = 'singleton')`,
            ),
          ),
        ),
      db
        .select({ projectId: project.id })
        .from(teamMember)
        .innerJoin(team, eq(teamMember.teamId, team.id))
        .innerJoin(project, eq(team.projectId, project.id))
        .innerJoin(
          roleDefinition,
          eq(teamMember.roleDefinitionId, roleDefinition.id),
        )
        .innerJoin(
          roleDefinitionPermissionGroup,
          eq(roleDefinitionPermissionGroup.roleDefinitionId, roleDefinition.id),
        )
        .innerJoin(
          permissionGroup,
          eq(
            permissionGroup.id,
            roleDefinitionPermissionGroup.permissionGroupId,
          ),
        )
        .innerJoin(
          permissionGrant,
          and(
            eq(permissionGrant.permissionGroupId, permissionGroup.id),
            eq(permissionGrant.resource, "project_team"),
            eq(permissionGrant.action, "lead"),
          ),
        )
        .where(
          and(eq(teamMember.memberId, memberId), isNull(teamMember.leftAt)),
        ),
    ]);

    const grants = new Set(
      grantRows.map((row) => grantKey(row.resource, row.action)),
    );
    const leadProjectIds = [
      ...new Set(leadProjectRows.map((row) => row.projectId)),
    ];

    return { memberId, grants, leadProjectIds };
  },
);

/** Generic check against the permission catalog — see src/lib/permissions/catalog.ts. */
export function can(
  permissions: MemberPermissions,
  resource: PermissionResourceKey,
  action: string,
): boolean {
  return permissions.grants.has(grantKey(resource, action));
}

/** Board (or anyone with projects:write) manages every project; a project's own leads manage only that one. */
export function canManageProject(
  permissions: MemberPermissions,
  projectId: string,
): boolean {
  return (
    can(permissions, "projects", "write") ||
    permissions.leadProjectIds.includes(projectId)
  );
}

/** Every member may edit their own socials and study data, regardless of role. */
export function canEditOwnProfile(
  permissions: MemberPermissions,
  targetMemberId: string,
): boolean {
  return permissions.memberId === targetMemberId;
}
