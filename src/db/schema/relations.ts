import { relations } from "drizzle-orm";

import { user } from "@/db/auth-schema";

import { githubActivityEvent, projectRepository } from "./github";
import { member, memberEmail } from "./members";
import { project, team, teamMember } from "./projects";
import { roleAssignment, roleDefinition } from "./roles";
import { memberSection, section } from "./sections";

export const userRelations = relations(user, ({ one }) => ({
  member: one(member, { fields: [user.id], references: [member.userId] }),
}));

export const memberRelations = relations(member, ({ many, one }) => ({
  user: one(user, { fields: [member.userId], references: [user.id] }),
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
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  project: one(project, {
    fields: [team.projectId],
    references: [project.id],
  }),
  members: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
  member: one(member, {
    fields: [teamMember.memberId],
    references: [member.id],
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
