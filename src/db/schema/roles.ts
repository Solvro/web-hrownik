import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { permissionLevelEnum, roleScopeEnum } from "./enums";
import { member } from "./members";
import { project } from "./projects";
import { section } from "./sections";

export const roleDefinition = pgTable(
  "role_definition",
  {
    id: id(),
    scope: roleScopeEnum("scope").notNull(),
    name: text("name").notNull(),
    permissionLevel: permissionLevelEnum("permission_level").notNull(),
    githubTeamSlug: text("github_team_slug"),
    discordRoleId: text("discord_role_id"),
  },
  (table) => [
    unique("role_definition_scope_name_unique").on(table.scope, table.name),
  ],
);

export const roleAssignment = pgTable(
  "role_assignment",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    roleDefinitionId: text("role_definition_id")
      .notNull()
      .references(() => roleDefinition.id, { onDelete: "restrict" }),
    // Exactly one of these is set, matching roleDefinition.scope ("section" |
    // "project" | "board"); both null means a board-scoped role. Postgres
    // CHECK constraints can't reach across tables to validate this against
    // roleDefinition.scope, so that part is enforced in the application layer.
    sectionId: text("section_id").references(() => section.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    check(
      "role_assignment_single_target_check",
      sql`NOT (${table.sectionId} IS NOT NULL AND ${table.projectId} IS NOT NULL)`,
    ),
  ],
);
