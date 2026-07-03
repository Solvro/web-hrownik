import { isNotNull, isNull } from "drizzle-orm";

import { ContributorsList } from "@/components/github/contributors-list";
import type { ContributorEntry } from "@/components/github/contributors-list";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function ContributorsPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !can(permissions, "projects", "write")) {
    return <p className="text-muted-foreground">Brak dostępu do GitHuba.</p>;
  }

  const [events, members] = await Promise.all([
    db.query.githubActivityEvent.findMany({
      where: isNull(githubActivityEvent.memberId),
      columns: { githubLogin: true },
    }),
    db.query.member.findMany({
      where: isNotNull(member.githubUsername),
      columns: { githubUsername: true },
    }),
  ]);

  const memberGithubLogins = new Set(
    members.flatMap((row) =>
      row.githubUsername === null ? [] : [row.githubUsername.toLowerCase()],
    ),
  );

  const loginMap = new Map<string, ContributorEntry>();
  for (const event of events) {
    if (memberGithubLogins.has(event.githubLogin.toLowerCase())) {
      continue;
    }
    const existing = loginMap.get(event.githubLogin);
    if (existing !== undefined) {
      continue;
    }
    const type = event.githubLogin.toLowerCase().includes("bot")
      ? ("bot" as const)
      : ("external contributor" as const);
    loginMap.set(event.githubLogin, { login: event.githubLogin, type });
  }

  const contributors = [...loginMap.values()].toSorted((a, b) =>
    a.login.localeCompare(b.login),
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Kontrybutorzy spoza listy członków
      </h1>
      <ContributorsList contributors={contributors} />
    </div>
  );
}
