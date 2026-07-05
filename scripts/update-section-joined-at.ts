import { eq } from "drizzle-orm";

import { db } from "@/db";
import { memberSection } from "@/db/schema/sections";

const dryRun = process.argv.includes("--dry-run");

const JULY_2026_START = new Date("2026-07-01T00:00:00Z");
const JULY_2026_END = new Date("2026-07-07T23:59:59Z");

async function main() {
  const members = await db.query.member.findMany({
    with: {
      sections: {
        with: {
          section: true,
        },
      },
    },
  });

  let updated = 0;
  let warned = 0;
  let skipped = 0;

  for (const member of members) {
    if (member.sections.length === 0) {
      continue;
    }

    if (member.sections.length > 1) {
      console.warn(
        `Member ${member.fullName} has ${member.sections.length} sections: ${member.sections.map((s) => s.section.name).join(", ")} — needs manual review`,
      );
      warned++;
      continue;
    }

    const ms = member.sections[0];
    if (ms.leftAt !== null) {
      continue;
    }

    const joinedAt = new Date(ms.joinedAt);
    if (joinedAt >= JULY_2026_START && joinedAt <= JULY_2026_END) {
      if (dryRun) {
        console.info(
          `Would update ${member.fullName}: section joinedAt ${ms.joinedAt.toISOString()} → ${member.createdAt.toISOString()}`,
        );
      } else {
        await db
          .update(memberSection)
          .set({ joinedAt: member.createdAt })
          .where(eq(memberSection.id, ms.id));
        console.info(
          `Updated ${member.fullName}: section joinedAt ${ms.joinedAt.toISOString()} → ${member.createdAt.toISOString()}`,
        );
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.debug(
    JSON.stringify(
      { dryRun, total: members.length, updated, warned, skipped },
      null,
      2,
    ),
  );
}

await main();
process.exit(0); // eslint-disable-line unicorn/no-process-exit
