import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSection } from "@/actions/sections";
import { DeleteButton } from "@/components/delete-button";
import { SectionMembersBrowser } from "@/components/sections/section-members-browser";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { roleAssignment } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sectionRow = await db.query.section.findFirst({
    where: eq(section.id, id),
  });
  if (sectionRow === undefined) {
    notFound();
  }

  const activeRoles = await db.query.roleAssignment.findMany({
    where: and(
      eq(roleAssignment.sectionId, id),
      isNull(roleAssignment.endedAt),
    ),
    with: {
      roleDefinition: true,
      member: {
        with: {
          teamMemberships: {
            where: (teamMember, operators) =>
              operators.isNull(teamMember.leftAt),
            with: { team: { with: { project: true } } },
          },
        },
      },
    },
  });
  const memberRows = activeRoles.reduce<
    Map<
      string,
      {
        assignment: (typeof activeRoles)[number];
        roleNames: string[];
        joinedAt: Date;
      }
    >
  >((members, assignment) => {
    if (assignment.roleDefinition.scope !== "section") {
      return members;
    }
    const existing = members.get(assignment.memberId);
    if (existing === undefined) {
      members.set(assignment.memberId, {
        assignment,
        roleNames: [assignment.roleDefinition.name],
        joinedAt: assignment.startedAt,
      });
      return members;
    }
    existing.roleNames.push(assignment.roleDefinition.name);
    if (assignment.startedAt < existing.joinedAt) {
      existing.joinedAt = assignment.startedAt;
    }
    return members;
  }, new Map());

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManage =
    permissions !== null && can(permissions, "sections", "write");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">
            {sectionRow.name}
          </h1>
          {sectionRow.description !== null && (
            <p className="text-muted-foreground">{sectionRow.description}</p>
          )}
        </div>
        {canManage ? (
          <div className="flex flex-col gap-2 min-[360px]:flex-row">
            <Button asChild variant="outline">
              <Link href={`/sections/${id}/edit`}>Edytuj</Link>
            </Button>
            <DeleteButton
              action={deleteSection.bind(null, id)}
              confirmMessage={`Na pewno usunąć sekcję "${sectionRow.name}"? Tej operacji nie można cofnąć.`}
            >
              Usuń sekcję
            </DeleteButton>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Członkowie</h2>
        <SectionMembersBrowser
          members={[...memberRows.values()].map((membership) => ({
            id: membership.assignment.member.id,
            fullName: membership.assignment.member.fullName,
            githubUsername: membership.assignment.member.githubUsername,
            status: membership.assignment.member.status,
            joinedAt: membership.joinedAt,
            role: membership.roleNames.join(", "),
            projectBadges: membership.assignment.member.teamMemberships.map(
              (teamMembership) => ({
                id: teamMembership.team.project.id,
                name: teamMembership.team.project.name,
              }),
            ),
          }))}
        />
      </section>
    </div>
  );
}
