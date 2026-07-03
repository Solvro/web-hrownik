import { asc } from "drizzle-orm";

import { UnlinkedReposList } from "@/components/github/unlinked-repos-list";
import type {
  ProjectOption,
  TeamOption,
} from "@/components/github/unlinked-repos-list";
import { db } from "@/db";
import { project, team } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function RepositoriesPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !can(permissions, "projects", "write")) {
    return <p className="text-muted-foreground">Brak dostępu do GitHuba.</p>;
  }

  const [linkedRepos, orgRepos, projects, teams] = await Promise.all([
    db.query.projectRepository.findMany({
      columns: { githubRepoFullName: true },
    }),
    listOrgRepos(),
    db.query.project.findMany({
      orderBy: asc(project.name),
      columns: { id: true, name: true },
    }),
    db.query.team.findMany({
      orderBy: asc(team.name),
      columns: { id: true, name: true, projectId: true },
    }),
  ]);

  const linkedFullNames = new Set(
    linkedRepos.map((repo) => repo.githubRepoFullName),
  );
  const unlinkedRepos = orgRepos
    .filter((repo) => !linkedFullNames.has(repo.fullName))
    .map((repo) => repo.fullName)
    .toSorted((a, b) => a.localeCompare(b));

  const projectOptions: ProjectOption[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const teamOptions: TeamOption[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    projectId: t.projectId,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold">Repozytoria bez projektu</h1>
      <UnlinkedReposList
        repos={unlinkedRepos}
        projects={projectOptions}
        teams={teamOptions}
      />
    </div>
  );
}
