import { asc, inArray } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ProjectReposListSkeleton } from "@/components/github/github-skeletons";
import type {
  ProjectRepoEntry,
  ProjectTeamEntry,
} from "@/components/github/project-repos-list";
import { ProjectReposWithoutTeamList } from "@/components/github/project-repos-list";
import { db } from "@/db";
import { projectRepository } from "@/db/schema/github";
import { team } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default function ProjectReposPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Link
        href="/settings/github"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Wróć do przeglądu GitHub
      </Link>
      <h1 className="text-2xl font-semibold">
        Repozytoria projektu bez zespołu
      </h1>
      <Suspense fallback={<ProjectReposListSkeleton />}>
        <ProjectReposContent />
      </Suspense>
    </div>
  );
}

async function ProjectReposContent() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !can(permissions, "projects", "write")) {
    return <p className="text-muted-foreground">Brak dostępu do GitHuba.</p>;
  }

  const linkedRepos = await db.query.projectRepository.findMany({
    orderBy: asc(projectRepository.githubRepoFullName),
    with: {
      teams: true,
      project: { columns: { id: true, name: true, slug: true } },
    },
  });

  const reposWithoutTeam = linkedRepos.filter(
    (repo) => repo.teams.length === 0,
  );

  const projectIds = [
    ...new Set(reposWithoutTeam.map((repo) => repo.projectId)),
  ];
  const projectTeams: { id: string; name: string; projectId: string }[] =
    await db.query.team.findMany({
      where: inArray(team.projectId, projectIds),
      orderBy: asc(team.name),
      columns: { id: true, name: true, projectId: true },
    });

  const teamsByProjectId: Record<string, ProjectTeamEntry[]> = {};
  for (const t of projectTeams) {
    (teamsByProjectId[t.projectId] ??= []).push({ id: t.id, name: t.name });
  }

  const repos: ProjectRepoEntry[] = reposWithoutTeam.map((repo) => ({
    id: repo.id,
    githubRepoFullName: repo.githubRepoFullName,
    projectId: repo.projectId,
    projectName: repo.project.name,
    projectSlug: repo.project.slug,
  }));

  return (
    <ProjectReposWithoutTeamList
      repos={repos}
      teamsByProjectId={teamsByProjectId}
    />
  );
}
