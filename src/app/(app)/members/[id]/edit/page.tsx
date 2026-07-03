import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MemberForm } from "@/components/members/member-form";
import { db } from "@/db";
import { boardTerm } from "@/db/schema/boards";
import { member } from "@/db/schema/members";
import { roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { getUniversityInfoOptions } from "@/lib/integrations/topwr";
import {
  can,
  canEditOwnProfile,
  getMemberPermissions,
} from "@/lib/permissions";
import { studyYearOptions } from "@/lib/schemas/members";

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
      roleAssignments: { with: { roleDefinition: true, section: true } },
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
  const fullAccess =
    permissions !== null && can(permissions, "members", "write");
  const isSelf = permissions !== null && canEditOwnProfile(permissions, id);

  if (!fullAccess && !isSelf) {
    return (
      <p className="text-muted-foreground">
        Brak uprawnień do edycji tego profilu.
      </p>
    );
  }

  const [
    sections,
    roleDefinitions,
    boardTerms,
    members,
    universityInfoOptions,
  ] = fullAccess
    ? await Promise.all([
        db.query.section.findMany({ orderBy: asc(section.name) }),
        db.query.roleDefinition.findMany({
          orderBy: asc(roleDefinition.name),
        }),
        db.query.boardTerm.findMany({ orderBy: asc(boardTerm.startsAt) }),
        db.query.member.findMany({ orderBy: asc(member.fullName) }),
        getUniversityInfoOptions(),
      ])
    : [[], [], [], [], await getUniversityInfoOptions()];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold break-words">
        Edytuj: {profile.fullName}
      </h1>
      <MemberForm
        mode="edit"
        memberId={id}
        fullAccess={fullAccess}
        sections={sections}
        roleDefinitions={roleDefinitions}
        boardTerms={boardTerms}
        memberOptions={members}
        universityInfoOptions={universityInfoOptions}
        defaultValues={{
          fullName: profile.fullName,
          parentId: profile.parentId ?? "",
          githubUsername: profile.githubUsername ?? "",
          discordId: profile.discordId ?? "",
          facebookUrl: profile.facebookUrl ?? "",
          linkedinUrl: profile.linkedinUrl ?? "",
          instagramUrl: profile.instagramUrl ?? "",
          websiteUrl: profile.websiteUrl ?? "",
          photoUrl: profile.photoUrl ?? "",
          studentIndex: profile.studentIndex ?? "",
          studyDepartment: profile.studyDepartment ?? "",
          studyField: profile.studyField ?? "",
          studyYear: toStudyYearInput(profile.studyYear),
          bio: profile.bio ?? "",
          hrNotes: fullAccess ? (profile.hrNotes ?? "") : "",
          status: profile.status,
          emails: profile.emails.map((email) => ({
            email: email.email,
            kind: email.kind,
          })),
          sectionIds: activeSectionMemberships(profile.roleAssignments).map(
            (sectionRow) => sectionRow.id,
          ),
          roleAssignments: profile.roleAssignments
            .filter(
              (assignment) =>
                assignment.roleDefinition.scope !== "project" &&
                assignment.roleDefinition.scope !== "project_team" &&
                !(
                  assignment.roleDefinition.scope === "section" &&
                  assignment.roleDefinition.name === "członek"
                ),
            )
            .map((assignment) => ({
              roleDefinitionId: assignment.roleDefinitionId,
              boardTermId: assignment.boardTermId ?? undefined,
              sectionId: assignment.sectionId ?? undefined,
              projectId: assignment.projectId ?? undefined,
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

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toStudyYearInput(value: string | null) {
  return studyYearOptions.find((option) => option === value) ?? "";
}
