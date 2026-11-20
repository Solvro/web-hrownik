import { and, eq } from "drizzle-orm";

import type { DatabaseExecutor, Transaction } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { reattributeActivityForMember } from "@/lib/integrations/github-activity";
import { setMemberHrNote } from "@/lib/member-hr-notes";
import type { EmailKind } from "@/lib/schemas/members";

export type NewMemberValues = Omit<
  typeof member.$inferInsert,
  "id" | "userId" | "updatedAt"
>;

export type NewMemberRoleAssignment = Omit<
  typeof roleAssignment.$inferInsert,
  "id" | "memberId"
>;

export interface CreateMemberRecordInput {
  values: NewMemberValues;
  hrNotes?: string | null;
  emails: { email: string; kind: EmailKind }[];
  roleAssignments: NewMemberRoleAssignment[];
}

/**
 * The single path for creating a member (form, recruitment import, legacy
 * import): member row, HR note, e-mails, non-project role assignments and
 * re-attribution of GitHub activity recorded before the member existed.
 * Runs inside the caller's transaction so a failure leaves nothing behind;
 * side effects outside the database (onboarding invites) are the caller's
 * job, after the transaction commits.
 */
export async function createMemberRecord(
  tx: Transaction,
  input: CreateMemberRecordInput,
): Promise<typeof member.$inferSelect> {
  const [created] = await tx.insert(member).values(input.values).returning();

  await setMemberHrNote(created.id, input.hrNotes ?? null, tx);

  if (input.emails.length > 0) {
    await tx.insert(memberEmail).values(
      input.emails.map((email) => ({
        memberId: created.id,
        email: email.email.toLowerCase(),
        kind: email.kind,
      })),
    );
  }

  if (input.roleAssignments.length > 0) {
    await tx.insert(roleAssignment).values(
      input.roleAssignments.map((assignment) => ({
        ...assignment,
        memberId: created.id,
      })),
    );
  }

  if (created.githubUsername !== null) {
    await reattributeActivityForMember(created.id, created.githubUsername, tx);
  }

  return created;
}

/** The section-scoped „członek" role every section membership is stored as. */
export async function getSectionMemberRole(executor: DatabaseExecutor) {
  const role = await executor.query.roleDefinition.findFirst({
    where: and(
      eq(roleDefinition.scope, "section"),
      eq(roleDefinition.name, "członek"),
    ),
  });
  if (role === undefined) {
    throw new Error("Nie znaleziono roli członka sekcji.");
  }
  return role;
}
