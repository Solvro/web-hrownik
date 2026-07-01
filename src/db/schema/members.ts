import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "@/db/auth-schema";

import { id } from "./columns.helpers";
import { emailKindEnum, memberStatusEnum } from "./enums";

export const member = pgTable("member", {
  id: id(),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  parentId: text("parent_id").references((): AnyPgColumn => member.id, {
    onDelete: "set null",
  }),
  fullName: text("full_name").notNull(),
  githubUsername: text("github_username"),
  discordId: text("discord_id"),
  facebookUrl: text("facebook_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  photoUrl: text("photo_url"),
  studentIndex: text("student_index"),
  studyDepartment: text("study_department"),
  studyField: text("study_field"),
  studyYear: text("study_year"),
  bio: text("bio"),
  hrNotes: text("hr_notes"),
  status: memberStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const memberEmail = pgTable(
  "member_email",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    kind: emailKindEnum("kind").notNull().default("notification"),
    verifiedAt: timestamp("verified_at"),
  },
  (table) => [unique("member_email_email_unique").on(table.email)],
);
