import { asc } from "drizzle-orm";
import { FileUp, UserPlus } from "lucide-react";
import Link from "next/link";

import { MembersTable } from "@/components/members/members-table";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function MembersPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  const members = await db.query.member.findMany({
    orderBy: asc(member.fullName),
    with: {
      roleAssignments: { with: { roleDefinition: true, section: true } },
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Członkowie</h1>
        {permissions !== null && can(permissions, "members", "write") ? (
          <div className="flex flex-col gap-2 min-[360px]:flex-row sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/members/import">
                <FileUp />
                Importuj z pliku
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/members/new">
                <UserPlus />
                Dodaj członka
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <MembersTable
        members={members.map((memberRow) => ({
          id: memberRow.id,
          fullName: memberRow.fullName,
          githubUsername: memberRow.githubUsername,
          status: memberRow.status,
          sections: activeSectionMemberships(memberRow.roleAssignments),
          roles: memberRow.roleAssignments.map((assignment) => ({
            id: assignment.roleDefinition.id,
            name: assignment.roleDefinition.name,
          })),
        }))}
      />
    </div>
  );
}

function activeSectionMemberships(
  assignments: {
    endedAt: Date | null;
    roleDefinition: { scope: string };
    section: { id: string; name: string } | null;
  }[],
) {
  const sections = new Map<string, { id: string; name: string }>();
  for (const assignment of assignments) {
    if (
      assignment.endedAt === null &&
      assignment.roleDefinition.scope === "section" &&
      assignment.section !== null
    ) {
      sections.set(assignment.section.id, assignment.section);
    }
  }
  return [...sections.values()];
}
