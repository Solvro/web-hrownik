import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MemberForm } from "@/components/members/member-form";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import {
  canEditOwnProfile,
  canManageMembers,
  getMemberPermissions,
} from "@/lib/permissions";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await db.query.member.findFirst({
    where: eq(member.id, id),
    with: {
      emails: true,
      sections: true,
    },
  });
  if (profile === undefined) {
    notFound();
  }

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const fullAccess = permissions !== null && canManageMembers(permissions);
  const isSelf = permissions !== null && canEditOwnProfile(permissions, id);

  if (!fullAccess && !isSelf) {
    return (
      <p className="text-muted-foreground">
        Brak uprawnień do edycji tego profilu.
      </p>
    );
  }

  const sections = fullAccess
    ? await db.query.section.findMany({ orderBy: asc(section.name) })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edytuj: {profile.fullName}</h1>
      <MemberForm
        mode="edit"
        memberId={id}
        fullAccess={fullAccess}
        sections={sections}
        projects={[]}
        roleDefinitions={[]}
        defaultValues={{
          fullName: profile.fullName,
          githubUsername: profile.githubUsername ?? "",
          discordId: profile.discordId ?? "",
          facebookUrl: profile.facebookUrl ?? "",
          studentIndex: profile.studentIndex ?? "",
          studyField: profile.studyField ?? "",
          studyYear: profile.studyYear ?? undefined,
          studySemester: profile.studySemester ?? undefined,
          bio: profile.bio ?? "",
          emails: profile.emails.map((email) => ({
            email: email.email,
            kind: email.kind,
          })),
          sectionIds: profile.sections.map(
            (membership) => membership.sectionId,
          ),
          roleAssignments: [],
        }}
      />
    </div>
  );
}
