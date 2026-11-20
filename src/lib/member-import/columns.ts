import { normalizeForMatching } from "./normalize";

/**
 * Member fields a recruitment export can be mapped onto. Nothing outside this
 * list is ever imported: open answers, the recruitment task, interview slots,
 * free-form comments or preliminary section choices have no target field, so
 * not even a manual mapping can put them in the database.
 */
export const recruitmentImportFields = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "externalId",
  "studentIndex",
  "studyDepartment",
  "studyField",
  "studyYear",
  "githubUsername",
  "githubPortfolio",
  "discordId",
  "facebookUrl",
  "sections",
] as const;

export type RecruitmentImportField = (typeof recruitmentImportFields)[number];

/** Field → index of the file column it's read from; absent = not imported. */
export type ColumnMapping = Partial<Record<RecruitmentImportField, number>>;

export type MappingConfidence = "high" | "medium" | "low";

export interface DetectedColumn {
  columnIndex: number;
  confidence: MappingConfidence;
}

export const recruitmentImportFieldLabels: Record<
  RecruitmentImportField,
  string
> = {
  firstName: "Imię",
  lastName: "Nazwisko",
  fullName: "Imię i nazwisko (jedna kolumna)",
  email: "E-mail",
  externalId: "ID zgłoszenia w Eventowniku",
  studentIndex: "Indeks",
  studyDepartment: "Wydział",
  studyField: "Kierunek",
  studyYear: "Rok i stopień studiów",
  githubUsername: "GitHub",
  githubPortfolio: "Portfolio (GitHub, jeśli brak osobnej kolumny)",
  discordId: "Discord",
  facebookUrl: "Facebook",
  sections: "Sekcje, do których przyjęto",
};

interface FieldRules {
  /** Most to least specific; a column scores its best matching rule. */
  rules: { pattern: RegExp; score: number }[];
  exclude?: RegExp[];
  /**
   * Expected shape of the column's values: most non-empty values matching it
   * is a bonus; for `strict` fields, few matching is a penalty, so e.g. a
   * question mentioning "e-mail" doesn't win over the actual address column.
   */
  values?: { pattern: RegExp; strict: boolean };
}

const fieldRules: Record<RecruitmentImportField, FieldRules> = {
  firstName: {
    rules: [
      { pattern: /^imie$/, score: 100 },
      { pattern: /first ?name/, score: 80 },
    ],
    exclude: [/nazwisko/],
  },
  lastName: {
    rules: [
      { pattern: /^nazwisko$/, score: 100 },
      { pattern: /last ?name/, score: 80 },
      { pattern: /surname/, score: 80 },
    ],
  },
  fullName: {
    rules: [
      { pattern: /imie i nazwisko/, score: 100 },
      { pattern: /full ?name/, score: 80 },
    ],
  },
  email: {
    rules: [
      { pattern: /^e ?mail$/, score: 100 },
      { pattern: /e ?mail/, score: 70 },
    ],
    values: { pattern: /@/, strict: true },
  },
  externalId: {
    rules: [
      { pattern: /participant ?uuid/, score: 100 },
      { pattern: /^uuid$/, score: 90 },
    ],
    values: {
      pattern: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i,
      strict: true,
    },
  },
  studentIndex: {
    rules: [
      { pattern: /^(nr )?indeks/, score: 100 },
      { pattern: /indeks/, score: 90 },
      { pattern: /index/, score: 70 },
      { pattern: /album/, score: 70 },
    ],
    values: { pattern: /^\d{6}$/, strict: true },
  },
  studyDepartment: {
    rules: [
      { pattern: /wydzial/, score: 100 },
      { pattern: /faculty/, score: 90 },
    ],
  },
  studyField: {
    rules: [
      { pattern: /kierunek/, score: 100 },
      { pattern: /field of study/, score: 90 },
    ],
  },
  studyYear: {
    rules: [
      { pattern: /rok i stopien/, score: 100 },
      { pattern: /^rok/, score: 80 },
      { pattern: /stopien/, score: 70 },
    ],
    exclude: [/rozmow/],
  },
  githubUsername: {
    rules: [
      { pattern: /^github$/, score: 100 },
      { pattern: /github/, score: 80 },
    ],
    exclude: [/portfolio/],
    values: { pattern: /github\.com/i, strict: false },
  },
  githubPortfolio: {
    rules: [{ pattern: /portfolio/, score: 80 }],
    values: { pattern: /github\.com/i, strict: false },
  },
  discordId: {
    rules: [{ pattern: /discord/, score: 100 }],
  },
  facebookUrl: {
    rules: [
      { pattern: /facebook/, score: 100 },
      { pattern: /^fb$/, score: 90 },
      { pattern: /messenger/, score: 80 },
    ],
    values: { pattern: /facebook\.com/i, strict: false },
  },
  sections: {
    rules: [
      { pattern: /sekcja ostateczn/, score: 100 },
      { pattern: /sekcj.* (przyjet|final)/, score: 90 },
      { pattern: /^sekcje?$/, score: 60 },
    ],
    exclude: [/wstepn/, /na rozmow/],
  },
};

const exactMatchBonus = 10;
const valueShapeBonus = 20;
const valueShapePenalty = 50;
const minimumScore = 50;

// Eventownik disambiguates repeated question names with " (<attribute uuid>)".
const duplicateSuffixPattern =
  /\s*\([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\)\s*$/i;

export function normalizeHeader(header: string): string {
  return normalizeForMatching(header.replace(duplicateSuffixPattern, ""));
}

/**
 * Proposes a column for every field: each (field, column) pair is scored by
 * its header rules plus the shape of the column's values, then pairs are
 * taken greedily from the highest score, one column per field and one field
 * per column. Ties go to the leftmost column.
 */
export function detectColumns(
  headers: string[],
  rows: string[][],
): Partial<Record<RecruitmentImportField, DetectedColumn>> {
  const candidates: {
    field: RecruitmentImportField;
    columnIndex: number;
    score: number;
  }[] = [];

  for (const [columnIndex, header] of headers.entries()) {
    const normalized = normalizeHeader(header);
    if (normalized === "") {
      continue;
    }
    const values = rows
      .map((row) => (row[columnIndex] ?? "").trim())
      .filter((value) => value !== "");
    for (const field of recruitmentImportFields) {
      const score = scoreColumn(fieldRules[field], normalized, values);
      if (score >= minimumScore) {
        candidates.push({ field, columnIndex, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.columnIndex - b.columnIndex);

  const detected: Partial<Record<RecruitmentImportField, DetectedColumn>> = {};
  const usedColumns = new Set<number>();
  for (const candidate of candidates) {
    if (
      detected[candidate.field] !== undefined ||
      usedColumns.has(candidate.columnIndex)
    ) {
      continue;
    }
    detected[candidate.field] = {
      columnIndex: candidate.columnIndex,
      confidence:
        candidate.score >= 100
          ? "high"
          : candidate.score >= 75
            ? "medium"
            : "low",
    };
    usedColumns.add(candidate.columnIndex);
  }
  return detected;
}

function scoreColumn(
  { rules, exclude = [], values: valueShape }: FieldRules,
  header: string,
  values: string[],
): number {
  if (exclude.some((pattern) => pattern.test(header))) {
    return 0;
  }
  let best = 0;
  for (const { pattern, score } of rules) {
    const match = pattern.exec(header);
    if (match !== null) {
      best = Math.max(
        best,
        score + (match[0] === header ? exactMatchBonus : 0),
      );
    }
  }
  if (best === 0 || valueShape === undefined || values.length === 0) {
    return best;
  }
  const matching = values.filter((value) =>
    valueShape.pattern.test(value),
  ).length;
  const ratio = matching / values.length;
  if (ratio >= 0.8) {
    return best + valueShapeBonus;
  }
  return valueShape.strict && ratio < 0.2 ? best - valueShapePenalty : best;
}

export type RequiredMapping = "name" | "email";

export const requiredMappingLabels: Record<RequiredMapping, string> = {
  name: "imię i nazwisko (dwie kolumny albo jedna wspólna)",
  email: "e-mail",
};

/** What's still missing before rows can be built from a mapping. */
export function missingRequiredFields(
  mapping: ColumnMapping,
): RequiredMapping[] {
  const missing: RequiredMapping[] = [];
  if (
    mapping.fullName === undefined &&
    (mapping.firstName === undefined || mapping.lastName === undefined)
  ) {
    missing.push("name");
  }
  if (mapping.email === undefined) {
    missing.push("email");
  }
  return missing;
}
