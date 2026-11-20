import * as z from "zod";

import type { EmailKind, studyYearOptions } from "@/lib/schemas/members";

export type StudyYear = (typeof studyYearOptions)[number];
export type StudiesType = "1DEGREE" | "2DEGREE";

/**
 * Comparison key for headers and free-text answers: lowercase, Polish
 * diacritics removed (NFD + `ł→l`), anything non-alphanumeric collapsed into
 * single spaces. "Rok i stopień" → "rok i stopien", "AI/ML" → "ai ml".
 */
export function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^a-z\d]+/g, " ")
    .trim();
}

const loginEmailDomains = ["@student.pwr.edu.pl", "@pwr.edu.pl"];
const emailSchema = z.email();

/** University addresses can log in (USOS/Solvro Auth); others only get notifications. */
export function normalizeEmail(
  raw: string,
): { email: string; kind: EmailKind } | null {
  const email = raw.trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return null;
  }
  const kind = loginEmailDomains.some((domain) => email.endsWith(domain))
    ? "login"
    : "notification";
  return { email, kind };
}

export function normalizeStudentIndex(raw: string): string | null {
  const value = raw.trim();
  return /^\d{6}$/.test(value) ? value : null;
}

export const githubUsernamePattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Username from a github.com link, or null when the value isn't one. */
export function extractGithubUsername(raw: string): string | null {
  const match = /github\.com\/([^/?#\s]+)/i.exec(raw);
  return match === null ? null : match[1];
}

/** A github.com link or a bare username (optionally prefixed with `@`). */
export function normalizeGithubUsername(raw: string): string | null {
  const value = raw.trim();
  const candidate = extractGithubUsername(value) ?? value.replace(/^@/, "");
  return githubUsernamePattern.test(candidate) ? candidate : null;
}

/** Portfolio answers only count as GitHub when they link to github.com. */
export function githubUsernameFromPortfolio(raw: string): string | null {
  const username = extractGithubUsername(raw);
  return username !== null && githubUsernamePattern.test(username)
    ? username
    : null;
}

/**
 * `discord.com/users/<id>` profile links become the numeric ID; any other
 * link (e.g. a `discord.gg` server invite) is rejected; anything else is
 * taken as a username without the leading `@`.
 */
export function normalizeDiscord(raw: string): string | null {
  const value = raw.trim();
  const profile = /discord(?:app)?\.com\/users\/(\d{15,21})/i.exec(value);
  if (profile !== null) {
    return profile[1];
  }
  if (
    /^https?:\/\//i.test(value) ||
    /discord(?:app)?\.(?:gg|com)\//i.test(value)
  ) {
    return null;
  }
  const username = value.replace(/^@/, "");
  return /^\S{2,32}$/.test(username) ? username : null;
}

/** The first http(s) link in the answer; plain names are dropped. */
export function normalizeFacebookUrl(raw: string): string | null {
  const match = /https?:\/\/\S+/i.exec(raw);
  return match === null ? null : match[0];
}

const firstCycleYears: StudyYear[] = [
  "I inżynierski",
  "II inżynierski",
  "III inżynierski",
  "IV inżynierski",
];
const secondCycleYears: StudyYear[] = ["I magisterski", "II magisterski"];

/**
 * Eventownik's "1 rok, I stopień" → "I inżynierski" (first-cycle studies run
 * four years), "2 rok, II stopień" → "II magisterski"; anything mentioning a
 * doctorate → "doktorat". Returns the studies type too, so the field of study
 * can be matched within the right cycle.
 */
export function normalizeStudyYear(
  raw: string,
): { studyYear: StudyYear; studiesType: StudiesType | null } | null {
  if (/doktor/i.test(raw)) {
    return { studyYear: "doktorat", studiesType: null };
  }
  const match = /(\d)\s*rok.*?[^a-z](I{1,2})\s*stopie/i.exec(raw);
  if (match === null) {
    return null;
  }
  const isSecondCycle = match[2].toUpperCase() === "II";
  const years = isSecondCycle ? secondCycleYears : firstCycleYears;
  const studyYear = years[Number(match[1]) - 1] as StudyYear | undefined;
  if (studyYear === undefined) {
    return null;
  }
  return { studyYear, studiesType: isSecondCycle ? "2DEGREE" : "1DEGREE" };
}

/**
 * Multi-value answers (Eventownik joins them with "; "). Never splits on `/`,
 * since section names such as "AI/ML" or "UI/UX Design" contain it.
 */
export function splitList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter((part) => part !== ""),
    ),
  ];
}
