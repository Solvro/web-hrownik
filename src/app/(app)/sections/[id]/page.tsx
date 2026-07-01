import { eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSection } from "@/actions/sections";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
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
    with: { members: { with: { member: true } } },
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
    <div className="max-w-2xl space-y-6">
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

      <section className="space-y-2">
        <h2 className="font-medium">Członkowie</h2>
        <ul className="divide-y rounded-md border">
          {sectionRow.members.map((membership) => (
            <li
              key={membership.id}
              className="flex items-center justify-between p-3"
            >
              <Link
                href={`/members/${membership.member.id}`}
                className="hover:underline"
              >
                {membership.member.fullName}
              </Link>
              {roleByMemberId.has(membership.memberId) ? (
                <Badge variant="outline">
                  {roleByMemberId.get(membership.memberId)}
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
