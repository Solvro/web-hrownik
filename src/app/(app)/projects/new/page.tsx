import { ProjectForm } from "@/components/projects/project-form";
import { db } from "@/db";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function NewProjectPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  if (permissions === null || !can(permissions, "projects", "write")) {
    return (
      <p className="text-muted-foreground">
        Tylko zarząd może tworzyć projekty.
      </p>
    );
  }

  const [orgRepos, linkedRepos] = await Promise.all([
    listOrgRepos(),
    db.query.projectRepository.findMany(),
  ]);
  const linkedFullNames = new Set(
    linkedRepos.map((repo) => repo.githubRepoFullName),
  );
  const repoOptions = orgRepos
    .filter((repo) => !linkedFullNames.has(repo.fullName))
    .map((repo) => ({ value: repo.fullName, label: repo.fullName }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nowy projekt</h1>
      <ProjectForm repoOptions={repoOptions} />
    </div>
  );
}
