import { assert, describe, expect, it } from "vitest";

import {
  matchDepartment,
  matchFieldOfStudy,
  matchSection,
} from "@/lib/member-import/matching";
import type { StudiesType } from "@/lib/member-import/normalize";

import { topwrSample } from "../fixtures/topwr";

const w4 = "Wydział Informatyki i Telekomunikacji";

describe("matchDepartment", () => {
  it.each([
    ["W4", w4],
    ["w13", "Wydział Matematyki"],
    [" W1 ", "Wydział Architektury"],
    ["Wydział Matematyki", "Wydział Matematyki"],
    ["Inny", null],
    ["W99", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(matchDepartment(raw, topwrSample.departments)?.value ?? null).toBe(
      expected,
    );
  });
});

describe("matchFieldOfStudy", () => {
  it.each<[string, string, StudiesType | null, string | null]>([
    [
      "Informatyka Stosowana",
      w4,
      "1DEGREE",
      "Informatyka stosowana (I stopień, W4)",
    ],
    [
      "informatyka stosowana",
      w4,
      "2DEGREE",
      "Informatyka stosowana (II stopień, W4)",
    ],
    [
      "Infromatyka algorytmiczna",
      w4,
      "1DEGREE",
      "Informatyka algorytmiczna (I stopień, W4)",
    ],
    [
      "Inżyneria systemów",
      w4,
      "1DEGREE",
      "Inżynieria systemów (I stopień, W4)",
    ],
    [
      "Informatyka Techniczna (ITE)",
      w4,
      "1DEGREE",
      "Informatyka techniczna (I stopień, W4)",
    ],
    [
      "Informatyka stosowana w języku angielskim",
      w4,
      "2DEGREE",
      "Informatyka stosowana w j. angielskim (II stopień, W4)",
    ],
    [
      "Informatyka Stosowana po Angielsku [ISTAN]",
      w4,
      "1DEGREE",
      "Informatyka stosowana w j. angielskim (I stopień, W4)",
    ],
    ["Teleinformatyka", w4, null, "Teleinformatyka (I stopień, W4)"],
    [
      "matematyka stosowana i sztuczna inteligencja",
      "Wydział Matematyki",
      "1DEGREE",
      "Matematyka stosowana i sztuczna inteligencja (I stopień, W13)",
    ],
    ["Informatyka", w4, "1DEGREE", null],
    ["Architektura", w4, "1DEGREE", null],
    ["Informatyka stosowana", w4, null, null],
    ["", w4, "1DEGREE", null],
  ])("%j in %s (%s) → %j", (raw, department, studiesType, expected) => {
    const matchedDepartment = matchDepartment(
      department,
      topwrSample.departments,
    );
    assert(matchedDepartment !== null);
    expect(
      matchFieldOfStudy(
        raw,
        { department: matchedDepartment, studiesType },
        topwrSample.fieldsOfStudy,
      )?.value ?? null,
    ).toBe(expected);
  });

  it.each<[string, string, StudiesType | null, string | null]>([
    ["IST", "W4", "1DEGREE", "29"],
    ["IST", "W4", "2DEGREE", "38"],
    ["SZT", "W4", "1DEGREE", "138"],
    ["IST", "W4", null, null],
    ["ist", "W4", "1DEGREE", null],
    ["ISTAN", "W4", "1DEGREE", null],
    ["kierunek IST", "W4", "1DEGREE", null],
    ["INK", "W4", "2DEGREE", null],
    ["IST", "W13", "1DEGREE", null],
  ])(
    "looks up the code %j in %s (%s) by ID",
    (raw, departmentCode, studiesType, id) => {
      const department = matchDepartment(
        departmentCode,
        topwrSample.departments,
      );
      assert(department !== null);
      expect(
        matchFieldOfStudy(
          raw,
          { department, studiesType },
          topwrSample.fieldsOfStudy,
        )?.id ?? null,
      ).toBe(id);
    },
  );
});

describe("matchSection", () => {
  const sections = [
    { id: "backend", name: "Backend" },
    { id: "frontend", name: "Front-end" },
    { id: "ai", name: "AI/ML" },
    { id: "uiux", name: "UI/UX" },
    { id: "pm", name: "Project Management" },
    { id: "promo", name: "Promocja" },
  ];

  it.each([
    ["Backend", "backend"],
    ["backend", "backend"],
    ["Frontend", "frontend"],
    ["AI/ML", "ai"],
    ["AI / ML", "ai"],
    ["UI/UX Design", "uiux"],
    ["PM", "pm"],
    ["Promotion", "promo"],
    ["Robotyka", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(matchSection(raw, sections)?.id ?? null).toBe(expected);
  });

  it.each([
    ["Project management", "management"],
    ["Project Management", "management"],
    ["project management", null],
    ["Project  management", null],
    ["Advanced Project management", null],
  ])("matches the complete section alias %j", (raw, expected) => {
    const management = { id: "management", name: "Management" };
    expect(matchSection(raw, [management])?.id ?? null).toBe(expected);
  });

  it("prefers an existing Project Management section to the alias", () => {
    expect(
      matchSection("Project management", [
        { id: "management", name: "Management" },
        ...sections,
      ])?.id,
    ).toBe("pm");
  });
});
