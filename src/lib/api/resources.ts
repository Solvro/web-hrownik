import { db } from "@/db";
import { member } from "@/db/schema/members";
import { project } from "@/db/schema/projects";
import { section } from "@/db/schema/sections";

interface RelationSpec {
  [name: string]: RelationSpec | undefined;
}

type MemberQueryConfiguration = Parameters<typeof db.query.member.findMany>[0];
type ProjectQueryConfiguration = Parameters<
  typeof db.query.project.findMany
>[0];
type SectionQueryConfiguration = Parameters<
  typeof db.query.section.findMany
>[0];

const memberRelations: RelationSpec = {};
const sectionRelations: RelationSpec = {};
const projectRelations: RelationSpec = {};
const teamRelations: RelationSpec = {};

Object.assign(memberRelations, {
  emails: {},
  parent: memberRelations,
  children: memberRelations,
  sections: { section: sectionRelations },
  roleAssignments: {
    roleDefinition: {},
    section: sectionRelations,
    project: projectRelations,
  },
  teamMemberships: {
    roleDefinition: {},
    team: teamRelations,
  },
});

Object.assign(sectionRelations, {
  members: {
    member: memberRelations,
  },
  roleAssignments: { member: {}, roleDefinition: {} },
});

Object.assign(projectRelations, {
  repositories: {},
  roleAssignments: { member: {}, roleDefinition: {} },
  teams: teamRelations,
  activityEvents: { member: {}, projectRepository: {} },
});

Object.assign(teamRelations, {
  project: projectRelations,
  members: { member: memberRelations, roleDefinition: {} },
  repositories: { projectRepository: {} },
});

export const memberApiConfig = {
  query: {
    findMany: (configuration: object) =>
      db.query.member.findMany(configuration as MemberQueryConfiguration),
    findFirst: (configuration: object) =>
      db.query.member.findFirst(configuration as MemberQueryConfiguration),
  },
  resource: "members",
  table: member,
  columns: {
    id: member.id,
    userId: member.userId,
    parentId: member.parentId,
    fullName: member.fullName,
    githubUsername: member.githubUsername,
    discordId: member.discordId,
    facebookUrl: member.facebookUrl,
    linkedinUrl: member.linkedinUrl,
    instagramUrl: member.instagramUrl,
    photoUrl: member.photoUrl,
    studentIndex: member.studentIndex,
    studyDepartment: member.studyDepartment,
    studyField: member.studyField,
    studyYear: member.studyYear,
    bio: member.bio,
    status: member.status,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  },
  columnsSelection: { hrNotes: false },
  defaultSort: "fullName",
  searchable: ["fullName", "githubUsername", "studentIndex", "bio"],
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
  columns: {
    id: project.id,
    name: project.name,
    slug: project.slug,
    status: project.status,
    visibility: project.visibility,
    productionUrl: project.productionUrl,
    driveFolderUrl: project.driveFolderUrl,
    projectCardDriveUrl: project.projectCardDriveUrl,
    reportDriveUrl: project.reportDriveUrl,
    endedAt: project.endedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  },
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
  columns: {
    id: section.id,
    name: section.name,
    description: section.description,
  },
  defaultSort: "name",
  searchable: ["name", "description"],
  relations: sectionRelations,
};
