import { describe, expect, it } from "vitest";

import {
  githubUsernameFromPortfolio,
  normalizeDiscord,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeGithubUsername,
  normalizeStudentIndex,
  normalizeStudyYear,
  splitList,
} from "@/lib/member-import/normalize";

describe("normalizeEmail", () => {
  it.each([
    [
      " 123456@Student.PWR.edu.pl ",
      { email: "123456@student.pwr.edu.pl", kind: "login" },
    ],
    [
      "jan.kowalski@pwr.edu.pl",
      { email: "jan.kowalski@pwr.edu.pl", kind: "login" },
    ],
    [
      "Jan.Kowalski@Example.com",
      { email: "jan.kowalski@example.com", kind: "notification" },
    ],
    [
      "jan@student.po.edu.pl",
      { email: "jan@student.po.edu.pl", kind: "notification" },
    ],
    ["jan@notpwr.edu.pl", { email: "jan@notpwr.edu.pl", kind: "notification" }],
    ["hanna@", null],
    ["not an email", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeEmail(raw)).toEqual(expected);
  });
});

describe("normalizeStudentIndex", () => {
  it.each([
    ["123456", "123456"],
    [" 012345 ", "012345"],
    ["12345", null],
    ["1234567", null],
    ["12a456", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeStudentIndex(raw)).toBe(expected);
  });
});

describe("normalizeGithubUsername", () => {
  it.each([
    ["https://github.com/octo-cat", "octo-cat"],
    ["github.com/octo-cat/", "octo-cat"],
    ["https://www.github.com/octo-cat?tab=repositories", "octo-cat"],
    ["https://github.com/octo-cat/some-repo", "octo-cat"],
    ["octo-cat", "octo-cat"],
    ["@octo-cat", "octo-cat"],
    ["https://share.example.com/octo", null],
    ["-octo", null],
    ["two words", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeGithubUsername(raw)).toBe(expected);
  });
});

describe("githubUsernameFromPortfolio", () => {
  it.each([
    ["https://github.com/octo-cat", "octo-cat"],
    ["github.com/octo-cat", "octo-cat"],
    ["https://octo-cat.example.com", null],
    ["linkedin.com/in/octo-cat", null],
    ["octo-cat", null],
  ])("%j → %j", (raw, expected) => {
    expect(githubUsernameFromPortfolio(raw)).toBe(expected);
  });
});

describe("normalizeDiscord", () => {
  it.each([
    ["https://discord.com/users/123456789012345678", "123456789012345678"],
    ["discordapp.com/users/123456789012345678", "123456789012345678"],
    ["https://discord.gg/abcDEF", null],
    ["https://example.com/me", null],
    ["@nick.name", "nick.name"],
    ["nick_name", "nick_name"],
    ["oldname#1234", "oldname#1234"],
    ["two words", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeDiscord(raw)).toBe(expected);
  });
});

describe("normalizeFacebookUrl", () => {
  it.each([
    [
      "https://www.facebook.com/jan.kowalski",
      "https://www.facebook.com/jan.kowalski",
    ],
    [
      "Jan Kowalski https://facebook.com/profile.php?id=1",
      "https://facebook.com/profile.php?id=1",
    ],
    ["Jan Kowalski", null],
    ["facebook.com/jan", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeFacebookUrl(raw)).toBe(expected);
  });
});

describe("normalizeStudyYear", () => {
  it.each([
    [
      "1 rok, I stopień",
      { studyYear: "I inżynierski", studiesType: "1DEGREE" },
    ],
    [
      "2 rok, I stopień",
      { studyYear: "II inżynierski", studiesType: "1DEGREE" },
    ],
    [
      "3 rok, I stopień",
      { studyYear: "III inżynierski", studiesType: "1DEGREE" },
    ],
    [
      "4 rok, I stopień",
      { studyYear: "IV inżynierski", studiesType: "1DEGREE" },
    ],
    [
      "1 rok, II stopień",
      { studyYear: "I magisterski", studiesType: "2DEGREE" },
    ],
    [
      "2 rok, II stopień",
      { studyYear: "II magisterski", studiesType: "2DEGREE" },
    ],
    [
      "2 rok,II stopien",
      { studyYear: "II magisterski", studiesType: "2DEGREE" },
    ],
    ["Studia doktoranckie", { studyYear: "doktorat", studiesType: null }],
    ["5 rok, I stopień", null],
    ["3 rok, II stopień", null],
    ["pierwszy rok", null],
    ["", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeStudyYear(raw)).toEqual(expected);
  });
});

describe("splitList", () => {
  it.each([
    ["Backend", ["Backend"]],
    ["AI/ML; Backend", ["AI/ML", "Backend"]],
    ["UI/UX Design", ["UI/UX Design"]],
    ["Frontend, Mobile", ["Frontend", "Mobile"]],
    ["Backend; Backend", ["Backend"]],
    [" ; ", []],
  ])("%j → %j", (raw, expected) => {
    expect(splitList(raw)).toEqual(expected);
  });
});
