import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { account, user } from "@/db/auth-schema";
import { member, memberEmail } from "@/db/schema/members";
import { env } from "@/env";

import { roleAssignment, roleDefinition } from "./schema/roles";

const roleDefinitions: (typeof roleDefinition.$inferInsert)[] = [
  // Sekcja
  { scope: "section", name: "przewodniczący", permissionLevel: "member" },
  { scope: "section", name: "wiceprzewodniczący", permissionLevel: "member" },
  { scope: "section", name: "członek", permissionLevel: "member" },

  // Projekt
  { scope: "project", name: "techlead", permissionLevel: "project_lead" },
  { scope: "project", name: "PM", permissionLevel: "project_lead" },
  { scope: "project", name: "PO", permissionLevel: "project_lead" },
  { scope: "project", name: "programista", permissionLevel: "member" },
  { scope: "project", name: "UI/UX designer", permissionLevel: "member" },

  // Zarząd
  { scope: "board", name: "prezes", permissionLevel: "board" },
  { scope: "board", name: "wiceprezes", permissionLevel: "board" },
  { scope: "board", name: "sekretarz", permissionLevel: "board" },
];

async function seed() {
  await db
    .insert(roleDefinition)
    .values(roleDefinitions)
    .onConflictDoNothing({
      target: [roleDefinition.scope, roleDefinition.name],
    });

  const adminUser = await seedAdminUser();

  console.log(`Seeded ${roleDefinitions.length} role definitions.`);
  console.log(`Seeded admin user ${adminUser.email}.`);
}

async function seedAdminUser() {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const now = new Date();

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const [adminUser] =
    existingUser.length > 0
      ? await db
          .update(user)
          .set({
            name: "Administrator",
            emailVerified: true,
            updatedAt: now,
          })
          .where(eq(user.id, existingUser[0].id))
          .returning()
      : await db
          .insert(user)
          .values({
            id: crypto.randomUUID(),
            name: "Administrator",
            email,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

  const password = await hashPassword(env.ADMIN_PASSWORD);
  const existingCredentialAccount = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, adminUser.id),
        eq(account.providerId, "credential"),
      ),
    )
    .limit(1);

  await (existingCredentialAccount.length > 0
    ? db
        .update(account)
        .set({ password, updatedAt: now })
        .where(eq(account.id, existingCredentialAccount[0].id))
    : db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: adminUser.id,
        providerId: "credential",
        userId: adminUser.id,
        password,
        createdAt: now,
        updatedAt: now,
      }));

  const existingMember = await db
    .select()
    .from(member)
    .where(eq(member.userId, adminUser.id))
    .limit(1);

  const [adminMember] =
    existingMember.length > 0
      ? await db
          .update(member)
          .set({ fullName: "Administrator", status: "active", updatedAt: now })
          .where(eq(member.id, existingMember[0].id))
          .returning()
      : await db
          .insert(member)
          .values({
            id: crypto.randomUUID(),
            userId: adminUser.id,
            fullName: "Administrator",
            status: "active",
            createdAt: now,
            updatedAt: now,
          })
          .returning();

  await db
    .insert(memberEmail)
    .values({
      id: crypto.randomUUID(),
      memberId: adminMember.id,
      email,
      kind: "login",
      verifiedAt: now,
    })
    .onConflictDoNothing({ target: memberEmail.email });

  const boardRole = await db.query.roleDefinition.findFirst({
    where: and(
      eq(roleDefinition.scope, "board"),
      eq(roleDefinition.permissionLevel, "board"),
    ),
  });

  if (boardRole === undefined) {
    throw new Error("Board role definition was not seeded.");
  }

  const existingBoardAssignment = await db
    .select()
    .from(roleAssignment)
    .where(
      and(
        eq(roleAssignment.memberId, adminMember.id),
        eq(roleAssignment.roleDefinitionId, boardRole.id),
      ),
    )
    .limit(1);

  if (existingBoardAssignment.length === 0) {
    await db.insert(roleAssignment).values({
      id: crypto.randomUUID(),
      memberId: adminMember.id,
      roleDefinitionId: boardRole.id,
      startedAt: now,
    });
  }

  return adminUser;
}

await seed();
process.exit(0);
