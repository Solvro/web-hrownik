import { asc } from "drizzle-orm";

import { MemberForm } from "@/components/members/member-form";
import { db } from "@/db";
import { boardTerm } from "@/db/schema/boards";
import { member } from "@/db/schema/members";
import { roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { getGithubUserProfile } from "@/lib/integrations/github";
import { getUniversityInfoOptions } from "@/lib/integrations/topwr";
import { can, getMemberPermissions } from "@/lib/permissions";
import type { MemberFormInput } from "@/lib/schemas/members";

const emptyValues: MemberFormInput = {
  fullName: "",
  parentId: "",
  githubUsername: "",
  discordId: "",
  facebookUrl: "",
  linkedinUrl: "",
  instagramUrl: "",
  websiteUrl: "",
  photoUrl: "",
  studentIndex: "",
  studyDepartment: "",
  studyField: "",
  studyYear: "",
  bio: "",
  hrNotes: "",
  status: "new",
  emails: [{ email: "", kind: "login" }],
  sectionIds: [],
  roleAssignments: [],
  sendGithubInvite: true,
  sendDiscordInvite: true,
};

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ githubUsername?: string; fullName?: string }>;
}) {
  const { githubUsername, fullName } = await searchParams;
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  if (permissions === null || !can(permissions, "members", "write")) {
    return (
      <p className="text-muted-foreground">
        Tylko zarząd może dodawać nowych członków.
      </p>
    );
  }

  const [
    sections,
    roleDefinitions,
    boardTerms,
    members,
    universityInfoOptions,
  ] = await Promise.all([
    db.query.section.findMany({ orderBy: asc(section.name) }),
    db.query.roleDefinition.findMany({ orderBy: asc(roleDefinition.name) }),
    db.query.boardTerm.findMany({ orderBy: asc(boardTerm.startsAt) }),
    db.query.member.findMany({ orderBy: asc(member.fullName) }),
    getUniversityInfoOptions(),
  ]);
  const githubProfile =
    githubUsername === undefined || fullName !== undefined
      ? null
      : await getGithubUserProfile(githubUsername);
  const defaultValues: MemberFormInput = {
    ...emptyValues,
    githubUsername: githubProfile?.login ?? githubUsername ?? "",
    fullName: fullName ?? githubProfile?.name ?? "",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dodaj członka</h1>
      <MemberForm
        mode="create"
        fullAccess
        sections={sections}
        roleDefinitions={roleDefinitions}
        boardTerms={boardTerms}
        memberOptions={members}
        universityInfoOptions={universityInfoOptions}
        defaultValues={defaultValues}
      />
    </div>
  );
}
