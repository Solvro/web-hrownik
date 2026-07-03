import { ProjectForm } from "@/components/projects/project-form";
import { db } from "@/db";
import { getCurrentMember } from "@/lib/current-member";
import { listOrgRepos } from "@/lib/integrations/github";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ repository?: string }>;
}) {
  const { repository } = await searchParams;
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

  const preselectedRepo =
    repository !== undefined && !linkedFullNames.has(repository)
      ? repository
      : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dodaj projekt</h1>
      <ProjectForm
        repoOptions={repoOptions}
        defaultValues={
          preselectedRepo === undefined
            ? undefined
            : {
                name: "",
                slug: "",
                status: "active",
                startedAt: "",
                visibility: "internal",
                productionUrl: "",
                driveFolderUrl: "",
                projectCardDriveUrl: "",
                reportDriveUrl: "",
                leaderboardLimit: 5,
                leaderboardIncludeExternal: true,
                leaderboardIncludeBots: false,
                repositoryFullNames: [preselectedRepo],
                projectRoles: [],
              }
        }
      />
    </div>
  );
}
