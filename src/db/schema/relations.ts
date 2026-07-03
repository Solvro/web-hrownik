import { relations } from "drizzle-orm";

import { user } from "@/db/auth-schema";

import { apiKey, apiKeyEndpointStat } from "./api-keys";
import { boardSettings, boardTerm } from "./boards";
import {
  githubActivityEvent,
  projectRepository,
  teamRepository,
} from "./github";
import { member, memberEmail } from "./members";
import { project, projectStatus, team, teamMember } from "./projects";
import {
  permissionGrant,
  permissionGroup,
  roleAssignment,
  roleDefinition,
  roleDefinitionPermissionGroup,
} from "./roles";
import { memberSection, section } from "./sections";

export const userRelations = relations(user, ({ one }) => ({
  member: one(member, { fields: [user.id], references: [member.userId] }),
}));

export const memberRelations = relations(member, ({ many, one }) => ({
  user: one(user, { fields: [member.userId], references: [user.id] }),
  parent: one(member, {
    fields: [member.parentId],
    references: [member.id],
    relationName: "memberParent",
  }),
  children: many(member, { relationName: "memberParent" }),
  emails: many(memberEmail),
  sections: many(memberSection),
  roleAssignments: many(roleAssignment),
  teamMemberships: many(teamMember),
  activityEvents: many(githubActivityEvent),
}));

export const memberEmailRelations = relations(memberEmail, ({ one }) => ({
  member: one(member, {
    fields: [memberEmail.memberId],
    references: [member.id],
  }),
}));

export const sectionRelations = relations(section, ({ many }) => ({
  members: many(memberSection),
  roleAssignments: many(roleAssignment),
}));

export const boardTermRelations = relations(boardTerm, ({ many }) => ({
  roleAssignments: many(roleAssignment),
}));

export const boardSettingsRelations = relations(boardSettings, ({ one }) => ({
  activeBoardTerm: one(boardTerm, {
    fields: [boardSettings.activeBoardTermId],
    references: [boardTerm.id],
  }),
}));

export const memberSectionRelations = relations(memberSection, ({ one }) => ({
  member: one(member, {
    fields: [memberSection.memberId],
    references: [member.id],
  }),
  section: one(section, {
    fields: [memberSection.sectionId],
    references: [section.id],
  }),
}));

export const roleDefinitionRelations = relations(
  roleDefinition,
  ({ many }) => ({
    assignments: many(roleAssignment),
    teamMembers: many(teamMember),
    permissionGroupLinks: many(roleDefinitionPermissionGroup),
  }),
);

export const permissionGroupRelations = relations(
  permissionGroup,
  ({ many }) => ({
    grants: many(permissionGrant),
    roleLinks: many(roleDefinitionPermissionGroup),
  }),
);

export const permissionGrantRelations = relations(
  permissionGrant,
  ({ one }) => ({
    permissionGroup: one(permissionGroup, {
      fields: [permissionGrant.permissionGroupId],
      references: [permissionGroup.id],
    }),
  }),
);

export const roleDefinitionPermissionGroupRelations = relations(
  roleDefinitionPermissionGroup,
  ({ one }) => ({
    roleDefinition: one(roleDefinition, {
      fields: [roleDefinitionPermissionGroup.roleDefinitionId],
      references: [roleDefinition.id],
    }),
    permissionGroup: one(permissionGroup, {
      fields: [roleDefinitionPermissionGroup.permissionGroupId],
      references: [permissionGroup.id],
    }),
  }),
);

export const roleAssignmentRelations = relations(roleAssignment, ({ one }) => ({
  member: one(member, {
    fields: [roleAssignment.memberId],
    references: [member.id],
  }),
  roleDefinition: one(roleDefinition, {
    fields: [roleAssignment.roleDefinitionId],
    references: [roleDefinition.id],
  }),
  boardTerm: one(boardTerm, {
    fields: [roleAssignment.boardTermId],
    references: [boardTerm.id],
  }),
  section: one(section, {
    fields: [roleAssignment.sectionId],
    references: [section.id],
  }),
  project: one(project, {
    fields: [roleAssignment.projectId],
    references: [project.id],
  }),
}));

export const projectRelations = relations(project, ({ many }) => ({
  repositories: many(projectRepository),
  teams: many(team),
  roleAssignments: many(roleAssignment),
  activityEvents: many(githubActivityEvent),
  statusHistory: many(projectStatus),
}));

export const projectStatusRelations = relations(projectStatus, ({ one }) => ({
  project: one(project, {
    fields: [projectStatus.projectId],
    references: [project.id],
  }),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  project: one(project, {
    fields: [team.projectId],
    references: [project.id],
  }),
  members: many(teamMember),
  repositories: many(teamRepository),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
  member: one(member, {
    fields: [teamMember.memberId],
    references: [member.id],
  }),
  roleDefinition: one(roleDefinition, {
    fields: [teamMember.roleDefinitionId],
    references: [roleDefinition.id],
  }),
}));

export const projectRepositoryRelations = relations(
  projectRepository,
  ({ one, many }) => ({
    project: one(project, {
      fields: [projectRepository.projectId],
      references: [project.id],
    }),
    activityEvents: many(githubActivityEvent),
    teams: many(teamRepository),
  }),
);

export const teamRepositoryRelations = relations(teamRepository, ({ one }) => ({
  team: one(team, { fields: [teamRepository.teamId], references: [team.id] }),
  projectRepository: one(projectRepository, {
    fields: [teamRepository.projectRepositoryId],
    references: [projectRepository.id],
  }),
}));

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  createdBy: one(member, {
    fields: [apiKey.createdByMemberId],
    references: [member.id],
  }),
  endpointStats: many(apiKeyEndpointStat),
}));

export const apiKeyEndpointStatRelations = relations(
  apiKeyEndpointStat,
  ({ one }) => ({
    apiKey: one(apiKey, {
      fields: [apiKeyEndpointStat.apiKeyId],
      references: [apiKey.id],
    }),
  }),
);

export const githubActivityEventRelations = relations(
  githubActivityEvent,
  ({ one }) => ({
    project: one(project, {
      fields: [githubActivityEvent.projectId],
      references: [project.id],
    }),
    projectRepository: one(projectRepository, {
      fields: [githubActivityEvent.projectRepositoryId],
      references: [projectRepository.id],
    }),
    member: one(member, {
      fields: [githubActivityEvent.memberId],
      references: [member.id],
    }),
  }),
);
