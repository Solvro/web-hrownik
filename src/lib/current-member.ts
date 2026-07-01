import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { auth } from "@/lib/auth";

/**
 * Resolves the better-auth session to an HRownik `member` row. A member is
 * created during onboarding before they ever log in, so the link to `user`
 * is only made on first successful login: by e-mail (Solvro Auth/USOS) or by
 * student index (USOS `studentNumber`, only present via better-auth-usos).
 */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function getCurrentMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null) {
    return null;
  }

  const linkedMember = await db.query.member.findFirst({
    where: eq(member.userId, session.user.id),
  });
  if (linkedMember !== undefined) {
    return linkedMember;
  }

  return linkMemberToUser(session.user);
}

async function linkMemberToUser(user: {
  id: string;
  email: string;
  studentNumber?: number | null;
}) {
  const byEmail = await db.query.memberEmail.findFirst({
    where: eq(memberEmail.email, user.email),
    with: { member: true },
  });

  const unlinkedCandidate =
    byEmail?.member.userId === null
      ? byEmail.member
      : user.studentNumber === null || user.studentNumber === undefined
        ? undefined
        : await db.query.member.findFirst({
            where: and(
              eq(member.studentIndex, String(user.studentNumber)),
              isNull(member.userId),
            ),
          });

  if (unlinkedCandidate === undefined) {
    return null;
  }

  const [linked] = await db
    .update(member)
    .set({ userId: user.id })
    .where(eq(member.id, unlinkedCandidate.id))
    .returning();

  return linked;
}
