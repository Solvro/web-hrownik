import { eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { deleteSection } from "@/actions/sections";
import { DeleteButton } from "@/components/delete-button";
import { SectionMembersBrowser } from "@/components/sections/section-members-browser";
import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sectionRow = await db.query.section.findFirst({
    where: eq(section.id, id),
    with: {
      members: {
        with: {
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
      },
    },
  });
  if (sectionRow === undefined) {
    notFound();
  }

  const activeRoles = await db.query.roleAssignment.findMany({
    where: (assignment, { and }) =>
      and(eq(assignment.sectionId, id), isNull(assignment.endedAt)),
    with: { roleDefinition: true },
  });
  const roleByMemberId = new Map(
    activeRoles.map((assignment) => [
      assignment.memberId,
      assignment.roleDefinition.name,
    ]),
  );

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManage = permissions !== null && canManageMembers(permissions);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{sectionRow.name}</h1>
          {sectionRow.description !== null && (
            <p className="text-muted-foreground">{sectionRow.description}</p>
          )}
        </div>
        {canManage ? (
          <DeleteButton
            action={deleteSection.bind(null, id)}
            confirmMessage={`Na pewno usunąć sekcję "${sectionRow.name}"? Tej operacji nie można cofnąć.`}
          >
            Usuń sekcję
          </DeleteButton>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Członkowie</h2>
        <SectionMembersBrowser
          members={sectionRow.members.map((membership) => ({
            id: membership.member.id,
            fullName: membership.member.fullName,
            githubUsername: membership.member.githubUsername,
            status: membership.member.status,
            joinedAt: membership.joinedAt,
            role: roleByMemberId.get(membership.memberId) ?? null,
            projectBadges: membership.member.teamMemberships.map(
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
