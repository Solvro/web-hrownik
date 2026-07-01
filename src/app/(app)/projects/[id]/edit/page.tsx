import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/projects/project-form";
import { db } from "@/db";
import { project } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { canManageProject, getMemberPermissions } from "@/lib/permissions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, id),
  });
  if (projectRow === undefined) {
    notFound();
  }

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !canManageProject(permissions, id)) {
    return (
      <p className="text-muted-foreground">
        Brak uprawnień do edycji tego projektu.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold break-words">
        Edytuj: {projectRow.name}
      </h1>
      <ProjectForm
        mode="edit"
        projectId={id}
        repoOptions={[]}
        defaultValues={{
          name: projectRow.name,
          slug: projectRow.slug,
          status: projectRow.status,
          visibility: projectRow.visibility,
          productionUrl: projectRow.productionUrl ?? "",
          driveFolderUrl: projectRow.driveFolderUrl ?? "",
          projectCardDriveUrl: projectRow.projectCardDriveUrl ?? "",
          reportDriveUrl: projectRow.reportDriveUrl ?? "",
          repositoryFullNames: [],
        }}
      />
    </div>
  );
}
