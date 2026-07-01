import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { account } from "@/db/auth-schema";
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

export async function getSessionAuthIdentity() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null) {
    return null;
  }

  const linkedAccount = await db.query.account.findFirst({
    where: eq(account.userId, session.user.id),
  });
  const providerId = linkedAccount?.providerId;
  const isUsosUser =
    session.user.usosId !== null && session.user.usosId !== undefined;

  return {
    email: session.user.email,
    accountId: linkedAccount?.accountId ?? null,
    providerName:
      providerId === "keycloak"
        ? "Solvro Auth"
        : providerId === "usos" || isUsosUser
          ? "USOS"
          : "konto lokalne",
    studentNumber: session.user.studentNumber ?? null,
    usosId: session.user.usosId ?? null,
  };
}

export const getCurrentMember = cache(async () => {
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
});

async function linkMemberToUser(user: {
  id: string;
  email: string;
  studentNumber?: number | null;
}) {
  const normalizedEmail = user.email.toLowerCase();
  const byEmail = await db.query.memberEmail.findFirst({
    where: and(
      eq(memberEmail.kind, "login"),
      sql`lower(${memberEmail.email}) = ${normalizedEmail}`,
    ),
    with: { member: true },
  });

  if (byEmail !== undefined) {
    if (byEmail.member.userId === null) {
      const [linked] = await db
        .update(member)
        .set({ userId: user.id })
        .where(eq(member.id, byEmail.member.id))
        .returning();

      return linked;
    }

    return byEmail.member;
  }

  const unlinkedCandidate =
    user.studentNumber === null || user.studentNumber === undefined
      ? undefined
      : await db.query.member.findFirst({
          where: eq(member.studentIndex, String(user.studentNumber)),
        });

  if (unlinkedCandidate === undefined) {
    return null;
  }

  if (unlinkedCandidate.userId !== null) {
    return unlinkedCandidate;
  }

  const [linked] = await db
    .update(member)
    .set({ userId: user.id })
    .where(eq(member.id, unlinkedCandidate.id))
    .returning();

  return linked;
}
