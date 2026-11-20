import { describe, expect, it } from "vitest";

import type { RecruitmentImportField } from "@/lib/member-import/columns";
import {
  detectColumns,
  missingRequiredFields,
  normalizeHeader,
} from "@/lib/member-import/columns";

import {
  eventownikHeaders,
  eventownikTable,
} from "../fixtures/eventownik-export";

/** Field → header text of the detected column, for readable assertions. */
function detectedHeaders(table: string[][]) {
  const [headers, ...rows] = table;
  return Object.fromEntries(
    Object.entries(detectColumns(headers, rows)).map(([field, column]) => [
      field,
      headers[column.columnIndex],
    ]),
  );
}

describe("normalizeHeader", () => {
  it.each([
    ["Imię", "imie"],
    ["Rok i stopień", "rok i stopien"],
    ["E-mail", "e mail"],
    ["Wydział", "wydzial"],
    ["Sekcja ostateczna", "sekcja ostateczna"],
    ["  Łączność / Kontakt  ", "lacznosc kontakt"],
    ["participantUuid", "participantuuid"],
    ["GitHub (7c9e6679-7425-40de-944b-e07fc1f90ae7)", "github"],
  ])("%j → %j", (header, expected) => {
    expect(normalizeHeader(header)).toBe(expected);
  });
});

describe("detectColumns", () => {
  it("maps every importable column of an Eventownik export with high confidence", () => {
    const [headers, ...rows] = eventownikTable();
    const detected = detectColumns(headers, rows);

    expect(detectedHeaders(eventownikTable())).toEqual({
      externalId: "participantUuid",
      email: "email",
      firstName: "Imię",
      lastName: "Nazwisko",
      studentIndex: "Indeks",
      studyField: "Kierunek",
      studyDepartment: "Wydział",
      studyYear: "Rok i stopień",
      githubPortfolio: "Link do GitHub albo portfolio",
      githubUsername: "GitHub",
      facebookUrl: "Facebook",
      discordId: "Discord",
      sections: "Sekcja ostateczna",
    });
    expect(
      Object.values(detected).every((column) => column.confidence === "high"),
    ).toBe(true);
  });

  it("never maps answers that have no member field", () => {
    const mapped = Object.values(detectedHeaders(eventownikTable()));

    for (const header of [
      eventownikHeaders[8],
      eventownikHeaders[9],
      "Zadanie rekrutacyjne",
      "Termin rozmowy",
      "Wolne myśli",
      "Sekcje",
      "Wstępny wybór sekcji",
      "Sekcja na rozmowę",
    ]) {
      expect(mapped).not.toContain(header);
    }
  });

  it("prefers the filled one of two columns with the same question name", () => {
    expect(
      detectedHeaders([
        [
          "email",
          "Imię",
          "Nazwisko",
          "GitHub (3f2a1b4c-0000-4000-8000-000000000001)",
          "GitHub",
        ],
        ["a@example.com", "A", "B", "", "https://github.com/a"],
        ["c@example.com", "C", "D", "", "https://github.com/c"],
      ]).githubUsername,
    ).toBe("GitHub");
  });

  it("does not take a column whose values don't look like the field", () => {
    expect(
      detectedHeaders([
        ["Imię i nazwisko", "Telefon lub e-mail rodzica"],
        ["Anna Testowa", "600 100 200"],
        ["Jan Testowy", "600 100 300"],
      ]).email,
    ).toBeUndefined();
  });

  it.each<[string, string[], Partial<Record<RecruitmentImportField, string>>]>([
    [
      "Polish questions renamed in another edition",
      [
        "participantUuid",
        "Adres e-mail",
        "Imię i nazwisko",
        "Numer indeksu",
        "Wydział (kod)",
        "Kierunek studiów",
        "Rok studiów",
        "Profil GitHub",
        "Nick na Discordzie",
        "Link do Facebooka",
        "Wstępnie wybrane sekcje",
        "Sekcja, do której przyjęto",
      ],
      {
        externalId: "participantUuid",
        email: "Adres e-mail",
        fullName: "Imię i nazwisko",
        studentIndex: "Numer indeksu",
        studyDepartment: "Wydział (kod)",
        studyField: "Kierunek studiów",
        studyYear: "Rok studiów",
        githubUsername: "Profil GitHub",
        discordId: "Nick na Discordzie",
        facebookUrl: "Link do Facebooka",
        sections: "Sekcja, do której przyjęto",
      },
    ],
    [
      "an English form",
      [
        "uuid",
        "E-mail",
        "First name",
        "Last name",
        "Index number",
        "Faculty",
        "Field of study",
        "GitHub",
        "Discord",
        "Facebook",
      ],
      {
        externalId: "uuid",
        email: "E-mail",
        firstName: "First name",
        lastName: "Last name",
        studentIndex: "Index number",
        studyDepartment: "Faculty",
        studyField: "Field of study",
        githubUsername: "GitHub",
        discordId: "Discord",
        facebookUrl: "Facebook",
      },
    ],
  ])("follows %s", (_, headers, expected) => {
    expect(detectedHeaders([headers])).toEqual(expected);
  });
});

describe("missingRequiredFields", () => {
  it.each([
    [{}, ["name", "email"]],
    [{ firstName: 0, email: 2 }, ["name"]],
    [{ firstName: 0, lastName: 1 }, ["email"]],
    [{ firstName: 0, lastName: 1, email: 2 }, []],
    [{ fullName: 0, email: 1 }, []],
  ])("%j → %j", (mapping, expected) => {
    expect(missingRequiredFields(mapping)).toEqual(expected);
  });
});
