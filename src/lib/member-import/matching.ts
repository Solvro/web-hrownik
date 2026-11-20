import type { StudiesType } from "./normalize";
import { normalizeForMatching } from "./normalize";

export interface DepartmentOption {
  value: string;
  code: string;
}

export interface FieldOfStudyOption {
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

/**
 * Field of study within the matched department (and studies cycle, when the
 * year was recognised): exact normalized name first, then the single most
 * similar name above the threshold — which absorbs case, typos and "w języku
 * angielskim" spelling variants, but not abbreviations like "IST". Anything
 * ambiguous or too far off is left for the board to pick.
 */
export function matchFieldOfStudy(
  raw: string,
  {
    department,
    studiesType,
  }: { department: string; studiesType: StudiesType | null },
  fieldsOfStudy: FieldOfStudyOption[],
): FieldOfStudyOption | null {
  const target = fieldOfStudyKey(raw);
  if (target === "") {
    return null;
  }
  const candidates = fieldsOfStudy.filter(
    (field) =>
      field.department === department &&
      (studiesType === null || field.studiesType === studiesType),
  );

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

/** An existing section by (aliased) name; the import never creates sections. */
export function matchSection<Section extends { name: string }>(
  raw: string,
  sections: Section[],
): Section | null {
  const key = sectionKey(raw);
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
