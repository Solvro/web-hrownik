import { asc } from "drizzle-orm";
import { FileUp, UserPlus } from "lucide-react";
import Link from "next/link";

import { MembersTable } from "@/components/members/members-table";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import {
  getGithubUserProfile,
  isGithubConfigured,
} from "@/lib/integrations/github";
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

  const githubSetup = isGithubConfigured();
  let invalidGithubMemberIds: Set<string> | undefined;

  if (githubSetup) {
    const withGithub = members.filter(
      (m): m is typeof m & { githubUsername: string } =>
        m.githubUsername !== null,
    );
    const checks = await Promise.allSettled(
      withGithub.map(async (m) => ({
        id: m.id,
        valid: (await getGithubUserProfile(m.githubUsername)) !== null,
      })),
    );
    invalidGithubMemberIds = new Set(
      checks
        .filter(
          (r): r is PromiseFulfilledResult<{ id: string; valid: boolean }> =>
            r.status === "fulfilled" && !r.value.valid,
        )
        .map((r) => r.value.id),
    );
  }

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
          githubUsernameInvalid:
            invalidGithubMemberIds?.has(memberRow.id) ?? false,
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
