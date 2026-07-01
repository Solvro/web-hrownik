import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { activityTypeEnum } from "./enums";
import { member } from "./members";
import { project } from "./projects";

export const projectRepository = pgTable(
  "project_repository",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    githubRepoFullName: text("github_repo_full_name").notNull(),
    githubRepoId: text("github_repo_id").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    unique("project_repository_full_name_unique").on(table.githubRepoFullName),
  ],
);

export const githubActivityEvent = pgTable(
  "github_activity_event",
  {
    id: id(),
    projectRepositoryId: text("project_repository_id")
      .notNull()
      .references(() => projectRepository.id, { onDelete: "cascade" }),
    // Denormalized from projectRepository.projectId: a repo belongs to
    // exactly one project, and this avoids a join for project-level queries.
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    githubLogin: text("github_login").notNull(),
    type: activityTypeEnum("type").notNull(),
    // Commit SHA, or PR/issue number — used to dedupe on re-sync.
    externalId: text("external_id").notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    url: text("url").notNull(),
  },
  (table) => [
    unique("github_activity_event_dedupe_unique").on(
      table.projectRepositoryId,
      table.type,
      table.externalId,
    ),
  ],
);
