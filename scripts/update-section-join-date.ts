import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";

const dryRun = process.argv.includes("--dry-run");
const applyAllSections = process.argv.includes("--apply-all-sections");

const JULY_2026_START = new Date("2026-07-01T00:00:00Z");
const JULY_2026_END = new Date("2026-07-07T23:59:59Z");

const CZLONEK_ROLE_NAME = "Członek";

async function main() {
  const czlonekRole = await db.query.roleDefinition.findFirst({
    where: and(
      eq(roleDefinition.scope, "section"),
      eq(roleDefinition.name, CZLONEK_ROLE_NAME),
    ),
  });

  if (czlonekRole === undefined) {
    throw new Error(`Role definition '${CZLONEK_ROLE_NAME}' not found`);
  }

  const members = await db.query.member.findMany({
    with: {
      roleAssignments: {
        where: and(
          eq(roleAssignment.roleDefinitionId, czlonekRole.id),
          isNull(roleAssignment.endedAt),
        ),
        with: {
          section: true,
        },
      },
    },
  });

  let updated = 0;
  let warned = 0;

  for (const member_ of members) {
    const matchingAssignments = member_.roleAssignments.filter((ra) => {
      const startedAt = new Date(ra.startedAt);
      return startedAt >= JULY_2026_START && startedAt <= JULY_2026_END;
    });

    if (matchingAssignments.length === 0) {
      continue;
    }

    if (matchingAssignments.length > 1 && !applyAllSections) {
      console.warn(
        `Member ${member_.fullName} has ${matchingAssignments.length} sections: ${matchingAssignments.map((ra) => ra.section?.name).join(", ")} — needs manual review`,
      );
      warned++;
      continue;
    }

    if (matchingAssignments.length > 1) {
      console.info(
        `Member ${member_.fullName} has ${matchingAssignments.length} sections: ${matchingAssignments.map((ra) => ra.section?.name).join(", ")} — applying to all`,
      );
    }

    for (const assignment of matchingAssignments) {
      const currentDate = new Date(assignment.startedAt);
      const targetDate = new Date(member_.createdAt);
      if (currentDate.getTime() === targetDate.getTime()) {
        continue;
      }

      if (dryRun) {
        console.info(
          `Would update ${member_.fullName} (${assignment.section?.name}): role assignment startedAt ${assignment.startedAt.toISOString()} → ${member_.createdAt.toISOString()}`,
        );
      } else {
        await db
          .update(roleAssignment)
          .set({ startedAt: member_.createdAt })
          .where(eq(roleAssignment.id, assignment.id));
        console.info(
          `Updated ${member_.fullName} (${assignment.section?.name}): role assignment startedAt ${assignment.startedAt.toISOString()} → ${member_.createdAt.toISOString()}`,
        );
      }
      updated++;
    }
  }

  console.debug(
    JSON.stringify({ dryRun, total: members.length, updated, warned }, null, 2),
  );
}

await main();
process.exit(0); // eslint-disable-line unicorn/no-process-exit
