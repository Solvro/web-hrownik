import { and, eq, inArray, ne } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { member, memberEmail, memberHrNote } from "@/db/schema/members";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import type { RecruitmentAnalysis } from "@/lib/member-import/recruitment";
import {
  analyzeRecruitmentFile,
  commitRecruitmentRows,
} from "@/lib/member-import/recruitment";

import {
  eventownikHeaders,
  eventownikTable,
  xlsxFile,
} from "../fixtures/eventownik-export";
import { topwrSample as university } from "../fixtures/topwr";
import {
  createMemberWithoutGrants,
  getAdminMemberId,
  resetMembersAndSections,
} from "./helpers";

const edition = "Rekrutacja 2026Z";
const joinedAt = "2026-10-15";

let adminId: string;
let sectionIds: Record<string, string>;

async function resetDatabase() {
  sectionIds = await resetMembersAndSections();
  adminId = await getAdminMemberId();
}

async function analyze(
  file: File | Promise<File> = xlsxFile(eventownikTable()),
  mapping?: string,
) {
  return analyzeRecruitmentFile({
    actorMemberId: adminId,
    file: await file,
    mapping,
    university,
  });
}

async function analyzeOk(file?: Promise<File>, mapping?: string) {
  const result = await analyze(file, mapping);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.analysis;
}

function byText(a: string, b: string) {
  return a.localeCompare(b);
}

function row(analysis: RecruitmentAnalysis, rowNumber: number) {
  const found = analysis.rows.find((r) => r.rowNumber === rowNumber);
  if (found === undefined) {
    throw new Error(`No preview row ${rowNumber}`);
  }
  return found;
}

/** What the board submits after fixing the one broken e-mail in the file. */
function reviewedRows(analysis: RecruitmentAnalysis) {
  return analysis.rows.map((r) =>
    r.rowNumber === 10 ? { ...r, email: "hanna.brakmaila@example.com" } : r,
  );
}

async function commit(rows: unknown[]) {
  const result = await commitRecruitmentRows({
    actorMemberId: adminId,
    input: { edition, joinedAt, rows },
    university,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.summary;
}

async function importedMembers() {
  return db.query.member.findMany({
    where: ne(member.id, adminId),
    with: { emails: true, roleAssignments: true, recruitments: true },
  });
}

describe("analyzing an Eventownik export", () => {
  beforeEach(resetDatabase);

  it("detects the columns and builds normalized preview rows", async () => {
    const analysis = await analyzeOk();

    expect(analysis.missingFields).toEqual([]);
    expect(analysis.headers).toEqual([...eventownikHeaders]);
    expect(analysis.rows.map((r) => r.rowNumber)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(
      analysis.rows.filter((r) => r.accepted).map((r) => r.rowNumber),
    ).toEqual([2, 3, 5, 6, 7, 8, 10]);
    expect(
      analysis.rows.filter((r) => r.include).map((r) => r.rowNumber),
    ).toEqual([2, 3, 5, 6, 7, 8, 10]);

    expect(row(analysis, 2)).toMatchObject({
      externalId: "0b6f6c1e-1a2b-4c3d-8e9f-000000000001",
      fullName: "Anna Testowa",
      email: "100001@student.pwr.edu.pl",
      emailKind: "login",
      studentIndex: "100001",
      githubUsername: "anna-testowa",
      discordId: "anna_testowa",
      facebookUrl: "https://www.facebook.com/anna.testowa.example",
      studyDepartment: "Wydział Informatyki i Telekomunikacji",
      studyField: "Informatyka stosowana (I stopień, W4)",
      studyYear: "II inżynierski",
      sectionIds: [sectionIds.Backend],
      warnings: [],
      duplicateReason: null,
    });
    expect(row(analysis, 3)).toMatchObject({
      fullName: "Bartłomiej Przykładowy",
      email: "bartek.przykladowy@example.com",
      emailKind: "notification",
      githubUsername: "bartek-p",
      discordId: "123456789012345678",
      studyDepartment: "Wydział Matematyki",
      studyField:
        "Matematyka stosowana i sztuczna inteligencja (I stopień, W13)",
      studyYear: "I inżynierski",
      sectionIds: [sectionIds["AI/ML"], sectionIds.Backend],
      warnings: [],
    });
    expect(row(analysis, 5)).toMatchObject({
      studentIndex: "",
      studyDepartment: "",
      studyField: "",
      studyYear: "III inżynierski",
      githubUsername: "dawid-spoza",
      discordId: "dawid.spoza",
      facebookUrl: "",
      sectionIds: [sectionIds["UI/UX"]],
      warnings: [
        "Nieprawidłowy numer indeksu — popraw ręcznie: „12345”",
        "Facebook bez linku do profilu: „Dawid Spoza”",
        "Nie dopasowano kierunku — wybierz z listy: „Kognitywistyka”",
      ],
    });
    expect(row(analysis, 6)).toMatchObject({
      studyYear: "I magisterski",
      studyField: "Informatyka stosowana w j. angielskim (II stopień, W4)",
      githubUsername: "",
      discordId: "",
      sectionIds: [sectionIds["Project Management"]],
      warnings: [
        "Nie rozpoznano konta GitHub: „https://share.example.com/ewa”",
        "Nie rozpoznano konta Discord: „https://discord.gg/abcDEF”",
        "Nie znaleziono sekcji — wybierz ręcznie: „Robotyka”",
      ],
    });
    expect(row(analysis, 7)).toMatchObject({
      studyField: "Informatyka algorytmiczna (I stopień, W4)",
      studyYear: "IV inżynierski",
      githubUsername: "filip-literowka",
      sectionIds: [sectionIds.DevOps],
    });
    expect(row(analysis, 8)).toMatchObject({
      studyField: "",
      studyYear: "",
      sectionIds: [sectionIds.Promocja],
      warnings: [
        "Nie rozpoznano roku studiów: „5 rok, I stopień”",
        "Nie dopasowano kierunku — wybierz z listy: „IST”",
      ],
    });
    expect(row(analysis, 9)).toMatchObject({
      accepted: false,
      include: false,
      duplicateReason: "Wiersz 2 w pliku ma ten sam adres e-mail.",
    });
    expect(row(analysis, 10)).toMatchObject({
      email: "",
      warnings: ["Nieprawidłowy adres e-mail: „hanna.brakmaila@”"],
    });
  });

  it("writes nothing to the database", async () => {
    await analyzeOk();

    expect(await importedMembers()).toEqual([]);
  });

  it("uses a manual mapping override instead of the detected one", async () => {
    const detected = await analyzeOk();
    const mapping = { ...detected.mapping, sections: 17 }; // "Sekcje"
    delete mapping.githubUsername;

    const analysis = await analyzeOk(
      xlsxFile(eventownikTable()),
      JSON.stringify(mapping),
    );

    expect(analysis.mapping).toEqual(mapping);
    expect(
      analysis.rows.filter((r) => r.accepted).map((r) => r.rowNumber),
    ).toEqual([2, 3]);
    expect(row(analysis, 3)).toMatchObject({
      sectionIds: [sectionIds["AI/ML"]],
      // Without the GitHub column, only portfolio links to github.com count.
      githubUsername: "bartek-p",
    });
    expect(row(analysis, 8).githubUsername).toBe("grzegorz-skrotowy");
    expect(row(analysis, 10).githubUsername).toBe("");
  });

  it.each([
    [
      JSON.stringify({ email: 1, firstName: 99 }),
      "Mapowanie wskazuje kolumnę spoza pliku.",
    ],
    [
      JSON.stringify({ email: 1, firstName: 1 }),
      "Każda kolumna może zasilać tylko jedno pole.",
    ],
    ["{not json", "Nieprawidłowe mapowanie kolumn."],
  ])("rejects an invalid mapping override %s", async (mapping, error) => {
    expect(await analyze(undefined, mapping)).toEqual({ ok: false, error });
  });

  it("asks for a mapping when required columns can't be found", async () => {
    const analysis = await analyzeOk(
      xlsxFile([
        ["Ulubiony kolor", "Pseudonim"],
        ["zielony", "Ania"],
      ]),
    );

    expect(analysis.missingFields).toEqual(["name", "email"]);
    expect(analysis.rows).toEqual([]);
  });

  it("accepts the same export saved as CSV", async () => {
    const csv = eventownikTable()
      .map((cells) =>
        cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const analysis = await analyzeOk(
      Promise.resolve(new File([csv], "participants.csv")),
    );

    expect(analysis.rows).toHaveLength(9);
    expect(row(analysis, 2).sectionIds).toEqual([sectionIds.Backend]);
  });

  it.each([
    [
      "an unsupported format",
      new File(["%PDF-1.7"], "participants.pdf"),
      "Wybierz plik .xlsx (eksport z Eventownika) albo .csv",
    ],
    [
      "a corrupted spreadsheet",
      new File(["definitely not a zip"], "participants.xlsx"),
      "Nie udało się odczytać pliku XLSX. Wgraj eksport uczestników z Eventownika.",
    ],
    [
      "a sheet with headers only",
      xlsxFile([[...eventownikHeaders]]),
      "Plik nie zawiera żadnych zgłoszeń.",
    ],
    [
      "a file over 5 MB",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "participants.xlsx"),
      "Plik jest za duży (maks. 5 MB)",
    ],
    ["no file at all", null, "Wybierz plik"],
  ])("rejects %s", async (_, file, error) => {
    const result = await analyzeRecruitmentFile({
      actorMemberId: adminId,
      file: await file,
      mapping: undefined,
      university,
    });

    expect(result).toEqual({ ok: false, error });
  });
});

describe("committing a recruitment import", () => {
  beforeEach(resetDatabase);

  it("creates new members with e-mails, section roles and recruitment records", async () => {
    const sectionsBefore = await db.select().from(section);
    const summary = await commit(reviewedRows(await analyzeOk()));

    expect(summary).toMatchObject({ created: 7, skipped: 0, errors: 0 });
    expect(
      summary.rows.every(
        (r) =>
          r.outcome === "created" &&
          r.onboarding?.githubInviteSent === false &&
          r.onboarding.discordInviteUrl === null,
      ),
    ).toBe(true);

    const members = await importedMembers();
    expect(members.map((m) => m.fullName).toSorted(byText)).toEqual([
      "Anna Testowa",
      "Bartłomiej Przykładowy",
      "Dawid Spoza",
      "Ewa Magisterska",
      "Filip Literówka",
      "Grzegorz Skrótowy",
      "Hanna Brakmaila",
    ]);
    expect(members.every((m) => m.status === "new")).toBe(true);

    const anna = members.find((m) => m.fullName === "Anna Testowa");
    expect(anna).toMatchObject({
      studentIndex: "100001",
      githubUsername: "anna-testowa",
      discordId: "anna_testowa",
      studyField: "Informatyka stosowana (I stopień, W4)",
      studyYear: "II inżynierski",
      emails: [
        expect.objectContaining({
          email: "100001@student.pwr.edu.pl",
          kind: "login",
        }),
      ],
      recruitments: [
        expect.objectContaining({
          source: "eventownik",
          externalParticipantId: "0b6f6c1e-1a2b-4c3d-8e9f-000000000001",
          edition,
          importedByMemberId: adminId,
        }),
      ],
    });
    expect(
      members.find((m) => m.fullName === "Hanna Brakmaila")?.emails,
    ).toEqual([
      expect.objectContaining({
        email: "hanna.brakmaila@example.com",
        kind: "notification",
      }),
    ]);

    const sectionMemberships = await db
      .select({
        fullName: member.fullName,
        sectionId: roleAssignment.sectionId,
        role: roleDefinition.name,
        startedAt: roleAssignment.startedAt,
        endedAt: roleAssignment.endedAt,
      })
      .from(roleAssignment)
      .innerJoin(member, eq(roleAssignment.memberId, member.id))
      .innerJoin(
        roleDefinition,
        eq(roleAssignment.roleDefinitionId, roleDefinition.id),
      )
      .where(ne(member.id, adminId));
    expect(
      sectionMemberships.filter((m) => m.fullName === "Bartłomiej Przykładowy"),
    ).toEqual(
      [sectionIds["AI/ML"], sectionIds.Backend].map((sectionId) => ({
        fullName: "Bartłomiej Przykładowy",
        sectionId,
        role: "członek",
        startedAt: new Date(`${joinedAt}T00:00:00`),
        endedAt: null,
      })),
    );
    expect(sectionMemberships).toHaveLength(8);

    expect(await db.select().from(section)).toEqual(sectionsBefore);
  });

  it("stores only mapped fields — no answers or HR notes from the file", async () => {
    await commit(reviewedRows(await analyzeOk()));

    const stored = JSON.stringify(
      await db.query.member.findMany({
        where: ne(member.id, adminId),
        with: { emails: true, recruitments: true, roleAssignments: true },
      }),
    );
    for (const answer of [
      "TypeScript, NestJS",
      "Wspinaczka",
      "Do zobaczenia na rozmowie",
      "anna-testowa/zadanie",
      "5d3c6a4e-0000-4000-8000-00000000aaaa",
    ]) {
      expect(stored).not.toContain(answer);
    }
    expect(await db.select().from(memberHrNote)).toEqual([]);
    const members = await importedMembers();
    expect(members.every((m) => m.bio === null)).toBe(true);
  });

  it("imports nothing twice from the same export", async () => {
    await commit(reviewedRows(await analyzeOk()));
    const firstRun = await importedMembers();

    const second = await analyzeOk();
    const importedRows = second.rows.filter((r) => r.accepted);
    expect(importedRows.every((r) => r.duplicateReason !== null)).toBe(true);
    expect(importedRows.some((r) => r.include)).toBe(false);
    expect(row(second, 2).duplicateReason).toBe(
      "To zgłoszenie zostało już zaimportowane (członek „Anna Testowa”).",
    );

    // Even when the board ticks every one of them again.
    const summary = await commit(
      reviewedRows(second)
        .filter((r) => r.accepted)
        .map((r) => ({ ...r, include: true })),
    );
    expect(summary).toMatchObject({ created: 0, skipped: 7, errors: 0 });
    expect(await importedMembers()).toHaveLength(firstRun.length);
  });

  it("treats a member added by hand with the same e-mail as a duplicate", async () => {
    const [existing] = await db
      .insert(member)
      .values({ fullName: "Anna T.", status: "active" })
      .returning();
    await db.insert(memberEmail).values({
      memberId: existing.id,
      email: "100001@student.pwr.edu.pl",
      kind: "login",
    });

    const analysis = await analyzeOk();

    expect(row(analysis, 2)).toMatchObject({
      include: false,
      duplicateReason: "Członek „Anna T.” ma ten sam adres e-mail.",
    });
  });

  it("keeps the other rows when one row fails", async () => {
    const analysis = await analyzeOk();
    const failing = { ...row(analysis, 3), sectionIds: ["no-such-section"] };

    const summary = await commit([row(analysis, 2), failing, row(analysis, 7)]);

    expect(summary).toMatchObject({ created: 2, skipped: 0, errors: 1 });
    expect(summary.rows.find((r) => r.rowNumber === 3)).toMatchObject({
      outcome: "error",
      detail: "Wybrana sekcja już nie istnieje.",
    });
    const members = await importedMembers();
    expect(members.map((m) => m.fullName).toSorted(byText)).toEqual([
      "Anna Testowa",
      "Filip Literówka",
    ]);
    // The failed row left nothing behind — not even its member row.
    expect(
      await db
        .select()
        .from(memberEmail)
        .where(eq(memberEmail.email, "bartek.przykladowy@example.com")),
    ).toEqual([]);
  });

  it("imports what the board edited in the preview", async () => {
    const analysis = await analyzeOk();
    const edited = {
      ...row(analysis, 8),
      fullName: "Grzegorz Skrótowy-Nowak",
      studyField: "Informatyka stosowana (I stopień, W4)",
      studyYear: "I inżynierski",
      sectionIds: [sectionIds.Frontend, sectionIds.Mobile],
    };

    await commit([edited]);

    const [created] = await importedMembers();
    expect(created).toMatchObject({
      fullName: "Grzegorz Skrótowy-Nowak",
      studyField: "Informatyka stosowana (I stopień, W4)",
      studyYear: "I inżynierski",
    });
    expect(
      created.roleAssignments.map((r) => r.sectionId ?? "").toSorted(byText),
    ).toEqual([sectionIds.Frontend, sectionIds.Mobile].toSorted(byText));
  });

  it("rejects the whole submission when an included row is invalid", async () => {
    const analysis = await analyzeOk();

    const result = await commitRecruitmentRows({
      actorMemberId: adminId,
      input: { edition, joinedAt, rows: analysis.rows },
      university,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Dane importu są nieprawidłowe — wróć do podglądu i popraw zaznaczone pola.",
    });
    expect(await importedMembers()).toEqual([]);
  });

  it.each([
    ["an unknown field of study", { studyField: "Kierunek spoza ToPWR" }],
    ["an unknown department", { studyDepartment: "Wydział Magii" }],
    [
      "a field from another department",
      { studyDepartment: "Wydział Matematyki" },
    ],
  ])("rejects a row with %s", async (_, change) => {
    const analysis = await analyzeOk();

    const result = await commitRecruitmentRows({
      actorMemberId: adminId,
      input: { edition, joinedAt, rows: [{ ...row(analysis, 2), ...change }] },
      university,
    });

    expect(result).toEqual({
      ok: false,
      error: "Nieznany wydział lub kierunek (wiersze: 2).",
    });
    expect(await importedMembers()).toEqual([]);
  });

  it("skips rows the board left unticked", async () => {
    const analysis = await analyzeOk();

    const summary = await commit(
      reviewedRows(analysis).map((r) => ({
        ...r,
        include: r.rowNumber === 2,
      })),
    );

    expect(summary.rows.map((r) => r.rowNumber)).toEqual([2]);
    expect(
      await db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            ne(member.id, adminId),
            inArray(member.fullName, ["Bartłomiej Przykładowy", "Dawid Spoza"]),
          ),
        ),
    ).toEqual([]);
  });
});

describe("authorization", () => {
  beforeEach(resetDatabase);

  it("only lets members with members:write analyze or commit", async () => {
    const regularMemberId = await createMemberWithoutGrants();
    const file = await xlsxFile(eventownikTable());

    for (const actorMemberId of [regularMemberId, null]) {
      await expect(
        analyzeRecruitmentFile({
          actorMemberId,
          file,
          mapping: undefined,
          university,
        }),
      ).rejects.toThrow(
        actorMemberId === null
          ? "Unauthorized"
          : "Tylko zarząd może importować członków.",
      );
      await expect(
        commitRecruitmentRows({
          actorMemberId,
          input: { edition, joinedAt, rows: [] },
          university,
        }),
      ).rejects.toThrow(
        actorMemberId === null
          ? "Unauthorized"
          : "Tylko zarząd może importować członków.",
      );
    }
  });
});
