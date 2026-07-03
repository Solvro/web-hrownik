import { asc, inArray, isNotNull, isNull } from "drizzle-orm";
import Link from "next/link";

import { AssignRepoToTeam } from "@/components/github/assign-repo-to-team";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { githubActivityEvent, projectRepository } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { team } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";

function classifyContributor(login: string) {
  return login.toLowerCase().includes("bot") ? "bot" : "external contributor";
}

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
    }),
    db.query.member.findMany({ where: isNotNull(member.githubUsername) }),
    db.query.projectRepository.findMany({
      orderBy: asc(projectRepository.githubRepoFullName),
      with: { teams: true, project: true },
    }),
    listOrgRepos(),
  ]);
  const memberGithubLogins = new Set(
    members.flatMap((row) =>
      row.githubUsername === null ? [] : [row.githubUsername.toLowerCase()],
    ),
  );
  const contributorLogins = [
    ...new Set(
      events
        .map((event) => event.githubLogin)
        .filter((login) => !memberGithubLogins.has(login.toLowerCase())),
    ),
  ].toSorted((a, b) => a.localeCompare(b));
  const linkedFullNames = new Set(
    linkedRepos.map((repo) => repo.githubRepoFullName),
  );
  const unlinkedOrgRepos = orgRepos
    .filter((repo) => !linkedFullNames.has(repo.fullName))
    .map((repo) => repo.fullName)
    .toSorted((a, b) => a.localeCompare(b));
  const reposWithoutTeam = linkedRepos.filter(
    (repo) => repo.teams.length === 0,
  );

  const projectIds = [
    ...new Set(reposWithoutTeam.map((repo) => repo.projectId)),
  ];
  const projectTeams =
    projectIds.length === 0
      ? []
      : await db.query.team.findMany({
          where: inArray(team.projectId, projectIds),
          orderBy: asc(team.name),
        });
  const teamsByProjectId = new Map<string, { id: string; name: string }[]>();
  for (const t of projectTeams) {
    const list = teamsByProjectId.get(t.projectId);
    if (list === undefined) {
      teamsByProjectId.set(t.projectId, [{ id: t.id, name: t.name }]);
    } else {
      list.push({ id: t.id, name: t.name });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">GitHub</h1>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Kontrybutorzy spoza listy członków</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm">
            {contributorLogins.map((login) => (
              <li
                key={login}
                className="flex items-center justify-between gap-2 p-2"
              >
                <span>{login}</span>
                <Badge variant="outline">{classifyContributor(login)}</Badge>
              </li>
            ))}
            {contributorLogins.length === 0 ? (
              <li className="text-muted-foreground p-2">Brak.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Repozytoria bez projektu</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm">
            {unlinkedOrgRepos.map((fullName) => (
              <li key={fullName} className="p-2">
                {fullName}
              </li>
            ))}
            {unlinkedOrgRepos.length === 0 ? (
              <li className="text-muted-foreground p-2">Brak.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Repozytoria projektu bez zespołu</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm">
            {reposWithoutTeam.map((repo) => (
              <li
                key={repo.id}
                className="flex items-center justify-between gap-2 p-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${repo.project.id}`}
                    className="hover:underline"
                  >
                    {repo.project.name}
                  </Link>{" "}
                  · {repo.githubRepoFullName}
                </div>
                <AssignRepoToTeam
                  repoId={repo.id}
                  repoFullName={repo.githubRepoFullName}
                  projectId={repo.projectId}
                  projectName={repo.project.name}
                  teams={teamsByProjectId.get(repo.projectId) ?? []}
                />
              </li>
            ))}
            {reposWithoutTeam.length === 0 ? (
              <li className="text-muted-foreground p-2">Brak.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
