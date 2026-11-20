import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { recruitmentSourceEnum } from "./enums";
import { member } from "./members";

// Where an imported member came from: deduplicates repeated imports of the
// same recruitment export and keys future sync with the Eventownik API.
export const memberRecruitment = pgTable(
  "member_recruitment",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    source: recruitmentSourceEnum("source").notNull(),
    // Eventownik's participantUuid; null when the file had no such column.
    externalParticipantId: text("external_participant_id"),
    edition: text("edition").notNull(),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
    importedByMemberId: text("imported_by_member_id").references(
      () => member.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    unique("member_recruitment_source_external_participant_id_unique").on(
      table.source,
      table.externalParticipantId,
    ),
  ],
);
