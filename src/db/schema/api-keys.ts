import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { member } from "./members";

export const apiKey = pgTable("api_key", {
  id: id(),
  name: text("name").notNull(),
  // sha256 of the raw secret — the raw value is only ever shown once, at
  // creation, and is never persisted.
  keyHash: text("key_hash").notNull().unique(),
  // First few characters of the raw secret, kept so the key can be
  // recognized in the list without exposing enough to forge a match.
  keyPrefix: text("key_prefix").notNull(),
  createdByMemberId: text("created_by_member_id").references(() => member.id, {
    onDelete: "set null",
  }),
  requestCount: integer("request_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-resource breakdown of apiKey.requestCount (e.g. "members", "projects",
// "sections") — one row is upserted per key/resource pair on first use.
export const apiKeyEndpointStat = pgTable(
  "api_key_endpoint_stat",
  {
    id: id(),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    unique("api_key_endpoint_stat_key_resource_unique").on(
      table.apiKeyId,
      table.resource,
    ),
  ],
);
