import { asc, eq, isNotNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AssignIssuePicker } from "@/components/projects/assign-issue-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { projectRepository } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { listOpenIssuesAndPulls } from "@/lib/integrations/github";
import { canManageProject, getMemberPermissions } from "@/lib/permissions";

export default async function ProjectRepositoryPage({
  params,
}: {
  params: Promise<{ id: string; repoId: string }>;
}) {
  const { id, repoId } = await params;

  const repo = await db.query.projectRepository.findFirst({
    where: eq(projectRepository.id, repoId),
  });
  if (repo === undefined) {
    notFound();
  }

  const items = await listOpenIssuesAndPulls(repo.githubRepoFullName);
  const issues = items.filter((item) => !item.isPullRequest);
  const pullRequests = items.filter((item) => item.isPullRequest);

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManage = permissions !== null && canManageProject(permissions, id);

  const membersWithGithub = canManage
    ? await db.query.member.findMany({
        where: isNotNull(member.githubUsername),
        orderBy: asc(member.fullName),
      })
    : [];
  const assignableMembers = membersWithGithub.filter(
    (row): row is typeof row & { githubUsername: string } =>
      row.githubUsername !== null,
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{repo.githubRepoFullName}</h1>
        <Button asChild variant="outline">
          <a
            href={`https://github.com/${repo.githubRepoFullName}`}
            target="_blank"
            rel="noreferrer"
          >
            Otwórz na GitHubie
          </a>
        </Button>
      </div>

      {canManage ? (
        <AssignIssuePicker
          repoFullName={repo.githubRepoFullName}
          members={assignableMembers}
        />
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Otwarte issues ({issues.length})</h2>
        <IssueList items={issues} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">
          Otwarte pull requesty ({pullRequests.length})
        </h2>
        <IssueList items={pullRequests} />
      </section>
    </div>
  );
}

function IssueList({
  items,
}: {
  items: { number: number; title: string; url: string; author: string }[];
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Brak.</p>;
  }
  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li key={item.number} className="flex items-center gap-2 p-2 text-sm">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            #{item.number} {item.title}
          </a>
          <Badge variant="outline" className="ml-auto">
            {item.author}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
