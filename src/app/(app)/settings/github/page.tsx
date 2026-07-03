import { isNotNull, isNull } from "drizzle-orm";
import { FolderKanban, GitBranch, UserPlus } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";
import { declineNumeric } from "@/lib/polish";

export default async function GithubSettingsPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !can(permissions, "projects", "write")) {
    return <p className="text-muted-foreground">Brak dostępu do GitHuba.</p>;
  }

  const [events, members, linkedRepos, orgRepos] = await Promise.all([
    db.query.githubActivityEvent.findMany({
      where: isNull(githubActivityEvent.memberId),
      columns: { githubLogin: true },
    }),
    db.query.member.findMany({
      where: isNotNull(member.githubUsername),
      columns: { githubUsername: true },
    }),
    db.query.projectRepository.findMany({
      with: { teams: true },
      columns: { githubRepoFullName: true },
    }),
    listOrgRepos(),
  ]);

  const memberGithubLogins = new Set(
    members.flatMap((row) =>
      row.githubUsername === null ? [] : [row.githubUsername.toLowerCase()],
    ),
  );
  const contributorCount = new Set(
    events
      .map((event) => event.githubLogin)
      .filter((login) => !memberGithubLogins.has(login.toLowerCase())),
  ).size;

  const linkedFullNames = new Set(
    linkedRepos.map((repo) => repo.githubRepoFullName),
  );
  const unlinkedCount = orgRepos.filter(
    (repo) => !linkedFullNames.has(repo.fullName),
  ).length;

  const reposWithoutTeamCount = linkedRepos.filter(
    (repo) => repo.teams.length === 0,
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">GitHub</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/github/contributors" className="block">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Kontrybutorzy spoza listy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{contributorCount}</p>
              <p className="text-muted-foreground text-sm">
                {declineNumeric(contributorCount, "element", true)} do
                przejrzenia
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/github/repositories" className="block">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4" />
                Repozytoria bez projektu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{unlinkedCount}</p>
              <p className="text-muted-foreground text-sm">
                {declineNumeric(unlinkedCount, "repozytorium", true)} bez
                projektu
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/github/project-repos" className="block">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="size-4" />
                Repozytoria bez zespołu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{reposWithoutTeamCount}</p>
              <p className="text-muted-foreground text-sm">
                {declineNumeric(reposWithoutTeamCount, "repozytorium", true)}{" "}
                bez zespołu
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
