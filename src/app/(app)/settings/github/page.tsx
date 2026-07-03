import { isNotNull, isNull } from "drizzle-orm";
import { FolderKanban, GitBranch, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function CountShimmer({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "via-accent/60 inline-block animate-pulse rounded-md bg-linear-to-r from-transparent to-transparent bg-[length:200%_100%] align-middle",
        className,
      )}
    >
      &nbsp;
    </span>
  );
}

export default function GithubSettingsPage() {
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
              <p className="text-3xl font-bold">
                <Suspense fallback={<CountShimmer className="h-9 w-12" />}>
                  <ContributorCount />
                </Suspense>
              </p>
              <p className="text-muted-foreground text-sm">
                elementów do przejrzenia
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
              <p className="text-3xl font-bold">
                <Suspense fallback={<CountShimmer className="h-9 w-12" />}>
                  <UnlinkedCount />
                </Suspense>
              </p>
              <p className="text-muted-foreground text-sm">bez projektu</p>
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
              <p className="text-3xl font-bold">
                <Suspense fallback={<CountShimmer className="h-9 w-12" />}>
                  <ReposWithoutTeamCount />
                </Suspense>
              </p>
              <p className="text-muted-foreground text-sm">bez zespołu</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

async function ContributorCount() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    return "—";
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    return "—";
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

  return new Set(
    events
      .map((event) => event.githubLogin)
      .filter((login) => !memberGithubLogins.has(login.toLowerCase())),
  ).size;
}

async function UnlinkedCount() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    return "—";
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    return "—";
  }

  const [linkedRepos, orgRepos] = await Promise.all([
    db.query.projectRepository.findMany({
      columns: { githubRepoFullName: true },
    }),
    listOrgRepos(),
  ]);

  const linkedFullNames = new Set(
    linkedRepos.map((repo) => repo.githubRepoFullName),
  );
  return orgRepos.filter((repo) => !linkedFullNames.has(repo.fullName)).length;
}

async function ReposWithoutTeamCount() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    return "—";
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "projects", "write")) {
    return "—";
  }

  const linkedRepos = await db.query.projectRepository.findMany({
    with: { teams: true },
    columns: { id: true },
  });

  return linkedRepos.filter((repo) => repo.teams.length === 0).length;
}
