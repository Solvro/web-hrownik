import { eq } from "drizzle-orm";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";

interface DirectusSocial {
  link: string;
}
interface DirectusTeamMember {
  name: string;
  subtitle?: string | null;
  photo: string | null;
  sociale?: DirectusSocial[];
}

interface DirectusResponse {
  data?: DirectusTeamMember[];
}

const DIRECTUS_URL =
  process.env.DIRECTUS_TEAM_URL ??
  "https://cms.solvro.pl/items/Team?limit=-1&fields=name,subtitle,photo,sociale.link";

const dryRun = process.argv.includes("--dry-run");

function normalizeName(name: string): string {
  return foldDiacritics(name).trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function foldDiacritics(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{Diacritic}/gu, "");
}

function stripQueryAndHash(url: string): string {
  const withoutHash = url.split("#")[0];
  return withoutHash.split("?")[0];
}

function normalizeLinkedIn(url: string): string {
  return stripQueryAndHash(url.trim()).replace(/\/$/, "");
}

function normalizeFacebook(url: string): string {
  const trimmed = url.trim().replace(/#$/, "");
  const [base, query = ""] = trimmed.split("?");
  if (query === "") {
    return base.replace(/\/$/, "");
  }
  const parameters = new URLSearchParams(query);
  const id = parameters.get("id");
  return id === null
    ? base.replace(/\/$/, "")
    : `${base.replace(/\/$/, "")}?id=${id}`;
}

function githubUsername(url: string): string | null {
  try {
    return (
      new URL(url.trim()).pathname.replace(/^\//, "").replace(/\/$/, "") || null
    );
  } catch {
    return null;
  }
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
  const existingMembers = await db.query.member.findMany({
    with: { emails: true },
  });

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

  let matched = 0;
  let missing = 0;
  let updated = 0;

  for (const imported of rows) {
    const memberRow = byName.get(normalizeName(imported.name));
    if (memberRow === undefined) {
      missing++;
      console.warn(`No member match for: ${imported.name}`);
      continue;
    }

    matched++;
    if (memberRow.fullName !== imported.name) {
      console.warn(
        `Name casing differs for ${memberRow.fullName} vs ${imported.name}`,
      );
    }

    const socials = imported.sociale ?? [];
    const patch: Record<string, string | null> = {};

    let websiteSet = memberRow.websiteUrl !== null;
    for (const social of socials) {
      const rawLink = social.link.trim();
      if (rawLink.startsWith("https://www.linkedin.com")) {
        if (memberRow.linkedinUrl === null) {
          patch.linkedinUrl = normalizeLinkedIn(rawLink);
        }
        continue;
      }
      if (rawLink.startsWith("mailto:")) {
        const email = rawLink.slice("mailto:".length).trim().toLowerCase();
        if (email !== "") {
          const existingEmail = memberRow.emails.some(
            (item) => item.email.toLowerCase() === email,
          );
          if (!existingEmail && !dryRun) {
            await db
              .insert(memberEmail)
              .values({ memberId: memberRow.id, email, kind: "notification" })
              .onConflictDoNothing({ target: memberEmail.email });
          }
        }
        continue;
      }
      if (rawLink.startsWith("https://github.com")) {
        const importedUsername = githubUsername(rawLink);
        if (importedUsername !== null) {
          if (memberRow.githubUsername === null) {
            patch.githubUsername = importedUsername;
          } else if (memberRow.githubUsername !== importedUsername) {
            console.warn(
              `GitHub mismatch for ${memberRow.fullName}: saved=${memberRow.githubUsername}, imported=${importedUsername}`,
            );
          }
        }
        continue;
      }
      if (rawLink.includes("facebook.com")) {
        if (memberRow.facebookUrl === null) {
          patch.facebookUrl = normalizeFacebook(rawLink);
        }
        continue;
      }
      if (rawLink.startsWith("https://www.instagram.com")) {
        if (memberRow.instagramUrl === null) {
          patch.instagramUrl = rawLink.replace(/\/$/, "");
        }
        continue;
      }
      if (rawLink.startsWith("https://discord.com")) {
        continue;
      }
      if (memberRow.websiteUrl === null && !websiteSet) {
        patch.websiteUrl = rawLink.replace(/\/$/, "");
        websiteSet = true;
      } else {
        console.warn(
          `Extra website-like link ignored for ${memberRow.fullName}: ${rawLink}`,
        );
      }
    }

    if (imported.photo !== null && memberRow.photoUrl === null) {
      patch.photoUrl = `https://cms.solvro.pl/assets/${imported.photo}`;
    }

    if (Object.keys(patch).length > 0) {
      updated++;
      if (!dryRun) {
        await db.update(member).set(patch).where(eq(member.id, memberRow.id));
      }
      console.info(
        `${dryRun ? "Would update" : "Updated"}: ${memberRow.fullName}`,
      );
    }
  }

  console.debug(
    JSON.stringify(
      { dryRun, fetched: rows.length, matched, missing, updated },
      null,
      2,
    ),
  );
}

await main();
process.exit(0); // eslint-disable-line unicorn/no-process-exit
