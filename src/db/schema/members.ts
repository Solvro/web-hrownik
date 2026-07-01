import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "@/db/auth-schema";

import { id } from "./columns.helpers";
import { emailKindEnum, memberStatusEnum } from "./enums";

export const member = pgTable("member", {
  id: id(),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  githubUsername: text("github_username"),
  discordId: text("discord_id"),
  facebookUrl: text("facebook_url"),
  studentIndex: text("student_index"),
  studyField: text("study_field"),
  studyYear: integer("study_year"),
  studySemester: integer("study_semester"),
  bio: text("bio"),
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
