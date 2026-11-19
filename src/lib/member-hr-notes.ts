import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { memberHrNote } from "@/db/schema/members";

/** Replaces a member's HR note; an empty or null value removes it. */
export async function setMemberHrNote(
  memberId: string,
  content: string | null,
): Promise<void> {
  if (content === null || content.trim() === "") {
    await db.delete(memberHrNote).where(eq(memberHrNote.memberId, memberId));
    return;
  }

  const now = new Date();
  await db
    .insert(memberHrNote)
    .values({ memberId, content, updatedAt: now })
    .onConflictDoUpdate({
      target: memberHrNote.memberId,
      set: { content, updatedAt: now },
    });
}

/** Appends a line to a member's HR note, creating the note if needed. */
export async function appendMemberHrNote(
  memberId: string,
  line: string,
): Promise<void> {
  const now = new Date();
  // Single upsert so concurrent appends to the same member can't drop a line.
  await db
    .insert(memberHrNote)
    .values({ memberId, content: line, updatedAt: now })
    .onConflictDoUpdate({
      target: memberHrNote.memberId,
      set: {
        content: sql`${memberHrNote.content} || E'\n' || excluded.content`,
        updatedAt: now,
      },
    });
}
