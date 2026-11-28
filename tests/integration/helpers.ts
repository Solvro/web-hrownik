import { eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { section } from "@/db/schema/sections";

/** The seeded administrator — a board member with `members:write`. */
export async function getAdminMemberId(): Promise<string> {
  const adminEmail = await db.query.memberEmail.findFirst({
    where: eq(memberEmail.email, "admin@example.com"),
  });
  if (adminEmail === undefined) {
    throw new Error("The test database was not seeded.");
  }
  return adminEmail.memberId;
}

/** A regular member without any role, hence without any grants. */
export async function createMemberWithoutGrants(): Promise<string> {
  const [created] = await db
    .insert(member)
    .values({ fullName: "Zwykły Członek", status: "active" })
    .returning();
  return created.id;
}

/**
 * Removes everyone but the administrator (cascading to e-mails, roles and
 * recruitment records) and recreates the club's sections, returning their
 * IDs by name.
 */
export async function resetMembersAndSections(
  names = [
    "Backend",
    "Frontend",
    "AI/ML",
    "DevOps",
    "Mobile",
    "UI/UX",
    "Management",
    "Promocja",
  ],
): Promise<Record<string, string>> {
  const adminMemberId = await getAdminMemberId();
  await db.delete(member).where(ne(member.id, adminMemberId));
  await db.delete(section);
  const created = await db
    .insert(section)
    .values(names.map((name) => ({ name })))
    .returning();
  return Object.fromEntries(created.map((row) => [row.name, row.id]));
}
