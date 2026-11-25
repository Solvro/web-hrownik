import type { Column } from "drizzle-orm";

import { db } from "@/db";
import { boardTerm } from "@/db/schema/boards";
import {
  githubActivityEvent,
  projectRepository,
  teamRepository,
} from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project, team, teamMember } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { memberSection, section } from "@/db/schema/sections";

export interface RelationNode {
  /** Public columns of the related table; anything not listed is never selected. */
  columns: Record<string, Column>;
  with: Record<string, RelationNode>;
}

type Relations = Record<string, RelationNode>;

type MemberQueryConfiguration = Parameters<typeof db.query.member.findMany>[0];
type ProjectQueryConfiguration = Parameters<
  typeof db.query.project.findMany
>[0];
type SectionQueryConfiguration = Parameters<
  typeof db.query.section.findMany
>[0];
type BoardTermQueryConfiguration = Parameters<
  typeof db.query.boardTerm.findMany
>[0];

function pick<T extends object, K extends keyof T>(
  table: T,
  keys: readonly K[],
) {
  return Object.fromEntries(keys.map((key) => [key, table[key]])) as Pick<T, K>;
}

// Allow-lists: a new column is private until it is added here.
const memberColumns = pick(member, [
  "id",
  "userId",
  "parentId",
  "fullName",
  "githubUsername",
  "facebookUrl",
  "linkedinUrl",
  "instagramUrl",
  "websiteUrl",
  "photoUrl",
  "studyDepartment",
  "studyField",
  "studyYear",
  "bio",
  "status",
  "createdAt",
  "updatedAt",
]);
const projectColumns = pick(project, [
  "id",
  "name",
  "slug",
  "status",
  "visibility",
  "productionUrl",
  "driveFolderUrl",
  "projectCardDriveUrl",
  "reportDriveUrl",
  "startedAt",
  "endedAt",
  "createdAt",
  "updatedAt",
]);
const sectionColumns = pick(section, ["id", "name", "description"]);
const boardTermColumns = pick(boardTerm, [
  "id",
  "name",
  "startsAt",
  "endsAt",
  "description",
  "createdAt",
  "updatedAt",
]);
const teamColumns = pick(team, [
  "id",
  "projectId",
  "name",
  "githubTeamSlug",
  "discordRoleId",
]);
const roleDefinitionColumns = pick(roleDefinition, [
  "id",
  "scope",
  "name",
  "githubTeamSlug",
  "discordRoleId",
]);
const roleAssignmentColumns = pick(roleAssignment, [
  "id",
  "memberId",
  "roleDefinitionId",
  "boardTermId",
  "sectionId",
  "projectId",
  "startedAt",
  "endedAt",
]);
const teamMemberColumns = pick(teamMember, [
  "id",
  "teamId",
  "memberId",
  "roleDefinitionId",
  "joinedAt",
  "leftAt",
]);
const memberSectionColumns = pick(memberSection, [
  "id",
  "memberId",
  "sectionId",
  "joinedAt",
  "leftAt",
]);
const projectRepositoryColumns = pick(projectRepository, [
  "id",
  "projectId",
  "githubRepoFullName",
  "githubRepoId",
  "addedAt",
]);
const teamRepositoryColumns = pick(teamRepository, [
  "id",
  "teamId",
  "projectRepositoryId",
]);
const activityEventColumns = pick(githubActivityEvent, [
  "id",
  "projectRepositoryId",
  "projectId",
  "memberId",
  "githubLogin",
  "type",
  "externalId",
  "occurredAt",
  "url",
  "title",
]);

const leaf = (columns: Record<string, Column>): RelationNode => ({
  columns,
  with: {},
});

const memberRelations: Relations = {};
const sectionRelations: Relations = {};
const projectRelations: Relations = {};
const teamRelations: Relations = {};

const memberNode = { columns: memberColumns, with: memberRelations };
const sectionNode = { columns: sectionColumns, with: sectionRelations };
const projectNode = { columns: projectColumns, with: projectRelations };
const teamNode = { columns: teamColumns, with: teamRelations };
const roleDefinitionNode = leaf(roleDefinitionColumns);

Object.assign(memberRelations, {
  parent: memberNode,
  children: memberNode,
  roleAssignments: {
    columns: roleAssignmentColumns,
    with: {
      roleDefinition: roleDefinitionNode,
      section: sectionNode,
      project: projectNode,
    },
  },
  teamMemberships: {
    columns: teamMemberColumns,
    with: { roleDefinition: roleDefinitionNode, team: teamNode },
  },
});

Object.assign(sectionRelations, {
  members: { columns: memberSectionColumns, with: { member: memberNode } },
  roleAssignments: {
    columns: roleAssignmentColumns,
    with: { member: leaf(memberColumns), roleDefinition: roleDefinitionNode },
  },
});

Object.assign(projectRelations, {
  repositories: leaf(projectRepositoryColumns),
  roleAssignments: {
    columns: roleAssignmentColumns,
    with: { member: leaf(memberColumns), roleDefinition: roleDefinitionNode },
  },
  teams: teamNode,
  activityEvents: {
    columns: activityEventColumns,
    with: {
      member: leaf(memberColumns),
      projectRepository: leaf(projectRepositoryColumns),
    },
  },
});

Object.assign(teamRelations, {
  project: projectNode,
  members: {
    columns: teamMemberColumns,
    with: { member: memberNode, roleDefinition: roleDefinitionNode },
  },
  repositories: {
    columns: teamRepositoryColumns,
    with: { projectRepository: leaf(projectRepositoryColumns) },
  },
});

const boardTermRelations: Relations = {
  roleAssignments: {
    columns: roleAssignmentColumns,
    with: {
      roleDefinition: roleDefinitionNode,
      member: memberNode,
      section: sectionNode,
      project: projectNode,
    },
  },
};

export const memberApiConfig = {
  query: {
    findMany: (configuration: object) =>
      db.query.member.findMany(configuration as MemberQueryConfiguration),
    findFirst: (configuration: object) =>
      db.query.member.findFirst(configuration as MemberQueryConfiguration),
  },
  resource: "members",
  table: member,
  columns: memberColumns,
  defaultSort: "fullName",
  searchable: ["fullName", "githubUsername", "bio"],
  relations: memberRelations,
};

export const projectApiConfig = {
  query: {
    findMany: (configuration: object) =>
      db.query.project.findMany(configuration as ProjectQueryConfiguration),
    findFirst: (configuration: object) =>
      db.query.project.findFirst(configuration as ProjectQueryConfiguration),
  },
  resource: "projects",
  table: project,
  columns: projectColumns,
  defaultSort: "name",
  searchable: ["name", "slug", "productionUrl"],
  relations: projectRelations,
};

export const sectionApiConfig = {
  query: {
    findMany: (configuration: object) =>
      db.query.section.findMany(configuration as SectionQueryConfiguration),
    findFirst: (configuration: object) =>
      db.query.section.findFirst(configuration as SectionQueryConfiguration),
  },
  resource: "sections",
  table: section,
  columns: sectionColumns,
  defaultSort: "name",
  searchable: ["name", "description"],
  relations: sectionRelations,
};

export const boardApiConfig = {
  query: {
    findMany: (configuration: object) =>
      db.query.boardTerm.findMany(configuration as BoardTermQueryConfiguration),
    findFirst: (configuration: object) =>
      db.query.boardTerm.findFirst(
        configuration as BoardTermQueryConfiguration,
      ),
  },
  resource: "boards",
  table: boardTerm,
  columns: boardTermColumns,
  defaultSort: "name",
  searchable: ["name", "description"],
  relations: boardTermRelations,
};
