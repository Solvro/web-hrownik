import type { StudiesType } from "./normalize";
import { normalizeForMatching } from "./normalize";

export interface DepartmentOption {
  value: string;
  code: string;
}

export interface FieldOfStudyOption {
  id: string;
  value: string;
  name: string;
  department: string;
  studiesType: string;
}

/**
 * Eventownik asks for the department code ("W4"); ToPWR codes are exactly
 * W1…W14, so the code maps straight to the stored department name. Full
 * names are accepted too, for editions that ask for them. "Inny" → null.
 */
export function matchDepartment(
  raw: string,
  departments: DepartmentOption[],
): DepartmentOption | null {
  const value = raw.trim().toUpperCase();
  const key = normalizeForMatching(raw);
  return (
    departments.find((department) => department.code.toUpperCase() === value) ??
    departments.find(
      (department) => normalizeForMatching(department.value) === key,
    ) ??
    null
  );
}

/**
 * Minimum similarity (1 − edit distance / longer length) for a fuzzy
 * field-of-study match: tolerates a typo or two, but not a name that merely
 * contains another ("Informatyka" vs "Teleinformatyka").
 */
const fieldOfStudySimilarityThreshold = 0.85;

// WIT's published admissions codes and the corresponding ToPWR W4 IDs.
// https://wit.pwr.edu.pl/kandydaci/studia-i-stopnia
// https://wit.pwr.edu.pl/kandydaci/studia-ii-stopnia
const witStudyProgramIds = new Map<
  string,
  Partial<Record<StudiesType, string>>
>([
  ["CBE", { "1DEGREE": "26", "2DEGREE": "35" }],
  ["ISA", { "1DEGREE": "27", "2DEGREE": "36" }],
  ["INA", { "1DEGREE": "28", "2DEGREE": "37" }],
  ["INK", {}], // Listed by WIT, awaiting a ToPWR entry.
  ["IST", { "1DEGREE": "29", "2DEGREE": "38" }],
  ["ITE", { "1DEGREE": "31", "2DEGREE": "40" }],
  ["INS", { "1DEGREE": "32", "2DEGREE": "42" }],
  ["SZT", { "1DEGREE": "138", "2DEGREE": "43" }],
  ["TIN", { "1DEGREE": "33", "2DEGREE": "44" }],
  ["TEL", { "1DEGREE": "34", "2DEGREE": "45" }],
  ["TAI", { "2DEGREE": "46" }],
]);

/**
 * Match WIT codes literally and resolve them by ToPWR ID within the study
 * cycle. Full program names use normalized and fuzzy matching.
 */
export function matchFieldOfStudy(
  raw: string,
  {
    department,
    studiesType,
  }: { department: DepartmentOption; studiesType: StudiesType | null },
  fieldsOfStudy: FieldOfStudyOption[],
): FieldOfStudyOption | null {
  const candidates = fieldsOfStudy.filter(
    (field) =>
      field.department === department.value &&
      (studiesType === null || field.studiesType === studiesType),
  );

  const ids =
    department.code === "W4" ? witStudyProgramIds.get(raw) : undefined;
  if (ids !== undefined) {
    const id = studiesType === null ? undefined : ids[studiesType];
    return candidates.find((field) => field.id === id) ?? null;
  }

  const target = fieldOfStudyKey(raw);
  if (target === "") {
    return null;
  }

  const exact = candidates.filter(
    (field) => fieldOfStudyKey(field.name) === target,
  );
  if (exact.length > 0) {
    return exact.length === 1 ? exact[0] : null;
  }

  const scored = candidates
    .map((field) => ({
      field,
      score: similarity(target, fieldOfStudyKey(field.name)),
    }))
    .toSorted((a, b) => b.score - a.score);
  const best = scored.at(0);
  const runnerUp = scored.at(1);
  if (
    best === undefined ||
    best.score < fieldOfStudySimilarityThreshold ||
    runnerUp?.score === best.score
  ) {
    return null;
  }
  return best.field;
}

function fieldOfStudyKey(name: string): string {
  return normalizeForMatching(name.replaceAll(/\([^)]*\)|\[[^\]]*\]/g, " "))
    .replaceAll(
      /\b(?:w jezyku angielskim|po angielsku|w j ang(?:ielskim)?)\b/g,
      "w j angielskim",
    )
    .trim();
}

function similarity(a: string, b: string): number {
  return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length, 1);
}

function levenshteinDistance(a: string, b: string): number {
  // Keys are normalized to [a-z0-9 ], so splitting into characters is safe.
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const charsB = [...b];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  for (const [indexA, charA] of [...a].entries()) {
    const current = [indexA + 1];
    for (const [indexB, charB] of charsB.entries()) {
      current.push(
        Math.min(
          previous[indexB + 1] + 1,
          current[indexB] + 1,
          previous[indexB] + (charA === charB ? 0 : 1),
        ),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

// Names the recruitment form (or the board, typing by hand) may use for the
// club's sections. Compared after normalization with spaces removed, so
// "Front-end" vs "Frontend" or "AI / ML" vs "AI/ML" need no entry here.
const sectionAliasGroups = [
  ["ai ml", "ai", "ml", "sztuczna inteligencja"],
  ["project management", "pm", "zarzadzanie projektami"],
  ["ui ux design", "ui ux", "ux ui", "design"],
  ["promotion", "promocja", "marketing"],
];

const exactSectionAliases = new Map([
  ["Project management", "Management"],
  ["Project Management", "Management"],
]);

/** An existing section by (aliased) name; the import never creates sections. */
export function matchSection<Section extends { name: string }>(
  raw: string,
  sections: Section[],
): Section | null {
  const key = sectionKey(raw);
  const exact = sections.find((section) => sectionKey(section.name) === key);
  if (exact !== undefined) {
    return exact;
  }

  const aliasTarget = exactSectionAliases.get(raw);
  const aliasedSection = sections.find(
    (section) => section.name === aliasTarget,
  );
  if (aliasedSection !== undefined) {
    return aliasedSection;
  }

  const group = sectionAliasGroups
    .map((aliases) => aliases.map((alias) => sectionKey(alias)))
    .find((aliases) => aliases.includes(key)) ?? [key];
  return (
    sections.find((section) => group.includes(sectionKey(section.name))) ?? null
  );
}

function sectionKey(name: string): string {
  return normalizeForMatching(name).replaceAll(" ", "");
}
