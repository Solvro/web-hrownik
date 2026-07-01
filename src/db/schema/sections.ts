import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { member } from "./members";

export const section = pgTable("section", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const memberSection = pgTable("member_section", {
  id: id(),
  memberId: text("member_id")
    .notNull()
    .references(() => member.id, { onDelete: "cascade" }),
  sectionId: text("section_id")
    .notNull()
    .references(() => section.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
});
