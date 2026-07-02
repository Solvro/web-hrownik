import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { projectStatusEnum, projectVisibilityEnum } from "./enums";
import { member } from "./members";
import { roleDefinition } from "./roles";

export const project = pgTable("project", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: projectStatusEnum("status").notNull().default("active"),
  visibility: projectVisibilityEnum("visibility").notNull().default("internal"),
  productionUrl: text("production_url"),
  driveFolderUrl: text("drive_folder_url"),
  projectCardDriveUrl: text("project_card_drive_url"),
  reportDriveUrl: text("report_drive_url"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const team = pgTable("team", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  githubTeamSlug: text("github_team_slug"),
  discordRoleId: text("discord_role_id"),
});

export const teamMember = pgTable("team_member", {
  id: id(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => member.id, { onDelete: "cascade" }),
  // Must point at a role_definition with scope = "project_team" — enforced in
  // the application layer, same convention as role_assignment's scope matching.
  roleDefinitionId: text("role_definition_id")
    .notNull()
    .references(() => roleDefinition.id, { onDelete: "restrict" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
});
