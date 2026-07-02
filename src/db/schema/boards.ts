import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";

export const boardTerm = pgTable("board_term", {
  id: id(),
  name: text("name").notNull().unique(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const boardSettings = pgTable(
  "board_settings",
  {
    id: text("id").primaryKey().default("singleton"),
    activeBoardTermId: text("active_board_term_id").references(
      () => boardTerm.id,
      { onDelete: "set null" },
    ),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("board_settings_singleton_unique").on(table.id),
    check("board_settings_singleton_check", sql`${table.id} = 'singleton'`),
  ],
);
