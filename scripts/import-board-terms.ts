import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { boardTerm } from "@/db/schema/boards";
import { member } from "@/db/schema/members";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";

const DIRECTUS_URL =
  process.env.DIRECTUS_BOARD_URL ??
  "https://cms.solvro.pl/items/Board_members?fields=Term.term,Member.name,Member.subtitle";

const BOARD_TERM_NAME_TEMPLATE = "{roman} Zarząd";

const dryRun = process.argv.includes("--dry-run");

const SPECIAL_TERMS: Record<string, string> = {
  Założyciele: "2018/2019",
};

const TERM_ROMAN: Record<string, string> = {
  "2026/2027": "IX",
  "2025/2026": "VIII",
  "2024/2025": "VII",
  "2023/2024": "VI",
  "2022/2023": "V",
  "2021/2022": "IV",
  "2020/2021": "III",
  "2019/2020": "II",
  "2018/2019": "I",
};

interface DirectusBoardMember {
  Term: { term: string };
  Member: { name: string; subtitle?: string | null };
}

interface DirectusResponse {
  data?: DirectusBoardMember[];
}

function normalizeName(name: string): string {
  return foldDiacritics(name).trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function foldDiacritics(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{Diacritic}/gu, "");
}

function parseTermDates(term: string): { startsAt: Date; endsAt: Date } {
  const match = /^(\d{4})\/(\d{4})$/.exec(term);
  if (match === null) {
    throw new Error(`Invalid term format: "${term}"`);
  }
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return {
    startsAt: new Date(Date.UTC(startYear, 3, 1)),
    endsAt: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)),
  };
}

function termDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function termToRoman(termLabel: string): string {
  const roman = TERM_ROMAN[termLabel];
  if (!roman) {
    throw new Error(`Unknown term: "${termLabel}"`);
  }
  return roman;
}

async function main() {
  const response = await fetch(DIRECTUS_URL);
  if (!response.ok) {
    throw new Error(
      `Directus request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as DirectusResponse;
  const rows = payload.data ?? [];

  const existingMembers = await db.query.member.findMany();
  const byName = new Map<string, (typeof existingMembers)[number]>();
  for (const row of existingMembers) {
    const key = normalizeName(row.fullName);
    if (byName.has(key)) {
      console.warn(
        `Duplicate existing member name match ignored: ${row.fullName}`,
      );
      continue;
    }
    byName.set(key, row);
  }

  const roleDefinitions = await db
    .select()
    .from(roleDefinition)
    .where(eq(roleDefinition.scope, "board"));

  const prezesRoleDefinition = roleDefinitions.find((r) => r.name === "Prezes");
  const wiceprezesRoleDefinition = roleDefinitions.find(
    (r) => r.name === "Wiceprezes",
  );

  if (prezesRoleDefinition === undefined) {
    console.warn('Role "Prezes" not found in board scope');
  }
  if (wiceprezesRoleDefinition === undefined) {
    console.warn('Role "Wiceprezes" not found in board scope');
  }

  const existingTerms = await db.query.boardTerm.findMany();
  const termsByDates = new Map<string, (typeof existingTerms)[number]>();
  for (const t of existingTerms) {
    const key =
      t.startsAt !== null && t.endsAt !== null
        ? `${termDateKey(t.startsAt)}-${termDateKey(t.endsAt)}`
        : t.name;
    termsByDates.set(key, t);
  }

  let fetched = 0;
  let matched = 0;
  let missing = 0;
  let termsCreated = 0;
  let assignmentsCreated = 0;
  let skipped = 0;
  let hrNotesUpdated = 0;
  const processedHrNotesMemberIds = new Set<string>();
  const processedAssignmentKeys = new Set<string>();

  for (const row of rows) {
    fetched++;
    const memberName = row.Member.name;
    const subtitle = row.Member.subtitle ?? null;
    const termLabel = SPECIAL_TERMS[row.Term.term] ?? row.Term.term;

    const memberRow = byName.get(normalizeName(memberName));
    if (memberRow === undefined) {
      missing++;
      console.warn(`No member match for: ${memberName}`);
      continue;
    }

    matched++;

    const { startsAt, endsAt } = parseTermDates(termLabel);
    const termKey = `${termDateKey(startsAt)}-${termDateKey(endsAt)}`;
    let term = termsByDates.get(termKey);

    if (term === undefined) {
      const roman = termToRoman(termLabel);
      const termName = BOARD_TERM_NAME_TEMPLATE.replace("{roman}", roman);
      if (dryRun) {
        console.info(`Would create term: '${termName}'`);
        term = {
          id: `dry-run-${termKey}`,
          name: termName,
          startsAt,
          endsAt,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as (typeof existingTerms)[number];
        termsByDates.set(termKey, term);
      } else {
        const [createdTerm] = await db
          .insert(boardTerm)
          .values({
            name: termName,
            startsAt,
            endsAt,
          })
          .returning();
        term = createdTerm;
        termsByDates.set(termKey, term);
      }
      termsCreated++;
    }

    const roleAssignmentDefinition =
      subtitle !== null &&
      /\bPrezes\b/i.test(subtitle) &&
      prezesRoleDefinition !== undefined
        ? prezesRoleDefinition
        : wiceprezesRoleDefinition;

    if (roleAssignmentDefinition === undefined) {
      console.warn(
        `No suitable role definition for ${memberName} (subtitle: ${subtitle})`,
      );
      continue;
    }

    const assignmentKey = `${memberRow.id}-${term.id}`;
    if (processedAssignmentKeys.has(assignmentKey)) {
      skipped++;
      continue;
    }

    const existingAssignments = await db
      .select()
      .from(roleAssignment)
      .where(
        and(
          eq(roleAssignment.memberId, memberRow.id),
          eq(roleAssignment.boardTermId, term.id),
        ),
      );

    if (existingAssignments.length > 0) {
      skipped++;
      continue;
    }

    processedAssignmentKeys.add(assignmentKey);

    if (dryRun) {
      console.info(
        `Would assign ${roleAssignmentDefinition.name} to ${memberName} for term '${term.name}'`,
      );
    } else {
      await db.insert(roleAssignment).values({
        memberId: memberRow.id,
        roleDefinitionId: roleAssignmentDefinition.id,
        boardTermId: term.id,
        startedAt: startsAt,
        endedAt: endsAt,
      });
      assignmentsCreated++;
    }

    if (
      subtitle !== null &&
      /założyciel|founder/i.test(subtitle) &&
      !processedHrNotesMemberIds.has(memberRow.id)
    ) {
      const note = "Założyciel";
      if (dryRun) {
        console.info(`Would add "${note}" to hrNotes for ${memberName}`);
      } else {
        const currentNotes = memberRow.hrNotes ?? "";
        const newNotes =
          currentNotes === "" ? note : `${currentNotes}\n${note}`;
        await db
          .update(member)
          .set({ hrNotes: newNotes })
          .where(eq(member.id, memberRow.id));
      }
      processedHrNotesMemberIds.add(memberRow.id);
      hrNotesUpdated++;
    }
  }

  console.debug(
    JSON.stringify(
      {
        dryRun,
        fetched,
        matched,
        missing,
        termsCreated,
        assignmentsCreated,
        skipped,
        hrNotesUpdated,
      },
      null,
      2,
    ),
  );
}

await main();
process.exit(0); // eslint-disable-line unicorn/no-process-exit
