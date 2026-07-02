import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/projects/project-form";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { project } from "@/db/schema/projects";
import { roleDefinition } from "@/db/schema/roles";
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
    with: { roleAssignments: { with: { roleDefinition: true } } },
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

  const [members, projectRoleDefinitions] = await Promise.all([
    db.query.member.findMany({ orderBy: asc(member.fullName) }),
    db.query.roleDefinition.findMany({
      where: eq(roleDefinition.scope, "project"),
      orderBy: asc(roleDefinition.name),
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold break-words">
        Edytuj: {projectRow.name}
      </h1>
      <ProjectForm
        mode="edit"
        projectId={id}
        repoOptions={[]}
        memberOptions={members.map((memberRow) => ({
          id: memberRow.id,
          fullName: memberRow.fullName,
        }))}
        projectRoleDefinitions={projectRoleDefinitions.map((role) => ({
          id: role.id,
          name: role.name,
        }))}
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
          projectRoles: projectRow.roleAssignments
            .filter(
              (assignment) =>
                assignment.roleDefinition.scope === "project" &&
                assignment.projectId === id,
            )
            .map((assignment) => ({
              memberId: assignment.memberId,
              roleDefinitionId: assignment.roleDefinitionId,
              startedAt: toDateInput(assignment.startedAt),
              endedAt:
                assignment.endedAt === null
                  ? ""
                  : toDateInput(assignment.endedAt),
            })),
        }}
      />
    </div>
  );
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
