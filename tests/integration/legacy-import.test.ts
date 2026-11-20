import { eq, ne } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { roleAssignment } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import {
  commitLegacyImport,
  previewLegacyImport,
} from "@/lib/member-import/legacy";

import {
  createMemberWithoutGrants,
  getAdminMemberId,
  resetMembersAndSections,
} from "./helpers";

// The historical "active members" tab, exported as TSV.
const headers = [
  "Imię",
  "Nazwisko",
  "Index",
  "Mail",
  "Data dołączenia",
  "Rodzic",
  "Wydział",
  "Kierunek",
  "Rok",
  "Messenger",
  "Discord",
  "Github",
  "Uwagi",
  "Zdanie o sobie na stronę",
  "Inne doświadcznie zawodowe/PWr",
  "Inne sekcje/projekty/role",
  "Podpisane oświadczenie",
  "Główna sekcja",
  "Inne sekcje",
  "Obecne projekty",
  "Przeszłe projekty",
  "Obecna rola",
];

function sheet(rows: Record<string, string>[]): string {
  return [
    headers.join("\t"),
    ...rows.map((row) => headers.map((header) => row[header] ?? "").join("\t")),
  ].join("\n");
}

const activeSheet = sheet([
  {
    Imię: "Jan",
    Nazwisko: "Archiwalny",
    Index: "200001",
    Mail: "200001@student.pwr.edu.pl",
    "Data dołączenia": "2024-03-01",
    Wydział: "Wydział Informatyki i Telekomunikacji",
    Kierunek: "Informatyka stosowana",
    Rok: "II inżynierki",
    Messenger: "https://facebook.com/jan.archiwalny.example",
    Discord: "jan_a",
    Github: "https://github.com/jan-archiwalny",
    Uwagi: "Bardzo aktywny",
    "Podpisane oświadczenie": "TRUE",
    "Główna sekcja": "Backend",
    "Inne sekcje": "Sekcja Historyczna",
    "Obecne projekty": "ToPWR",
  },
  {
    Imię: "Ola",
    Nazwisko: "Archiwalna",
    Mail: "ola.archiwalna@example.com",
    Rodzic: "Jan Archiwalny",
    Messenger: "Ola na messengerze",
    Github: "ola-a",
    "Główna sekcja": "Frontend",
  },
  { Uwagi: "wiersz pomocniczy bez osoby" },
  {
    Imię: "Admin",
    Nazwisko: "Duplikat",
    Mail: "admin@example.com",
  },
]);

let adminId: string;

describe("legacy member sheet import", () => {
  beforeEach(async () => {
    await resetMembersAndSections(["Backend", "Frontend"]);
    adminId = await getAdminMemberId();
  });

  it("previews rows with duplicates, notes and parent hints", async () => {
    const preview = await previewLegacyImport({
      actorMemberId: adminId,
      sheetType: "active",
      fileContents: activeSheet,
    });

    expect(preview.missingColumns).toEqual([]);
    expect(preview.blankRowsSkipped).toBe(1);
    expect(preview.rows.map((row) => [row.fullName, row.include])).toEqual([
      ["Jan Archiwalny", true],
      ["Ola Archiwalna", true],
      ["Admin Duplikat", false],
    ]);
    expect(preview.rows[0]).toMatchObject({
      status: "active",
      emailKind: "login",
      githubUsername: "jan-archiwalny",
      studyYear: "II inżynierski",
      sectionNames: ["Backend", "Sekcja Historyczna"],
      noteLines: [
        "Obecne projekty: ToPWR",
        "Uwagi: Bardzo aktywny",
        "Oświadczenie podpisane: tak",
      ],
    });
    expect(preview.rows[2].duplicateReason).toBe(
      "Członek z tym indeksem lub adresem e-mail już istnieje.",
    );
  });

  it("creates members, missing sections, roles and HR notes as before", async () => {
    const preview = await previewLegacyImport({
      actorMemberId: adminId,
      sheetType: "active",
      fileContents: activeSheet,
    });
    const rows = preview.rows.map(({ key, duplicateReason, ...row }) => row);

    const summary = await commitLegacyImport({ actorMemberId: adminId, rows });

    expect(summary).toMatchObject({ created: 2, skipped: 0, errors: 0 });
    const members = await db.query.member.findMany({
      where: ne(member.id, adminId),
      with: { emails: true, hrNote: true },
    });
    const jan = members.find((m) => m.fullName === "Jan Archiwalny");
    const ola = members.find((m) => m.fullName === "Ola Archiwalna");
    expect(jan).toMatchObject({
      status: "active",
      githubUsername: "jan-archiwalny",
      facebookUrl: "https://facebook.com/jan.archiwalny.example",
      createdAt: new Date("2024-03-01T00:00:00"),
      emails: [{ kind: "login" }],
      hrNote: {
        content:
          "Obecne projekty: ToPWR\nUwagi: Bardzo aktywny\nOświadczenie podpisane: tak",
      },
    });
    expect(ola).toMatchObject({
      parentId: jan?.id,
      emails: [{ kind: "notification" }],
      hrNote: { content: "Kontakt (Messenger/inne): Ola na messengerze" },
    });

    const sections = await db.select().from(section);
    expect(
      sections.map((s) => s.name).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["Backend", "Frontend", "Sekcja Historyczna"]);
    const janRoles = await db
      .select({ startedAt: roleAssignment.startedAt })
      .from(roleAssignment)
      .where(eq(roleAssignment.memberId, jan?.id ?? ""));
    expect(janRoles).toEqual([
      { startedAt: new Date("2024-03-01T00:00:00") },
      { startedAt: new Date("2024-03-01T00:00:00") },
    ]);

    const again = await commitLegacyImport({ actorMemberId: adminId, rows });
    expect(again).toMatchObject({ created: 0, skipped: 2, errors: 0 });
    expect(
      await db
        .select()
        .from(memberEmail)
        .where(eq(memberEmail.email, "ola.archiwalna@example.com")),
    ).toHaveLength(1);
  });

  it("is board-only", async () => {
    const regularMemberId = await createMemberWithoutGrants();

    await expect(
      previewLegacyImport({
        actorMemberId: regularMemberId,
        sheetType: "active",
        fileContents: activeSheet,
      }),
    ).rejects.toThrow("Tylko zarząd może importować członków.");
    await expect(
      commitLegacyImport({ actorMemberId: regularMemberId, rows: [] }),
    ).rejects.toThrow("Tylko zarząd może importować członków.");
  });
});
