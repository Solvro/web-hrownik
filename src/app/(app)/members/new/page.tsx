import { asc } from "drizzle-orm";

import { MemberForm } from "@/components/members/member-form";
import { db } from "@/db";
import { project } from "@/db/schema/projects";
import { roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { getGithubUserProfile } from "@/lib/integrations/github";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";
import type { MemberFormInput } from "@/lib/schemas/members";

const emptyValues: MemberFormInput = {
  fullName: "",
  githubUsername: "",
  discordId: "",
  facebookUrl: "",
  studentIndex: "",
  studyField: "",
  studyYear: undefined,
  studySemester: undefined,
  bio: "",
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

  if (permissions === null || !canManageMembers(permissions)) {
    return (
      <p className="text-muted-foreground">
        Tylko zarząd może dodawać nowych członków.
      </p>
    );
  }

  const [sections, projects, roleDefinitions] = await Promise.all([
    db.query.section.findMany({ orderBy: asc(section.name) }),
    db.query.project.findMany({ orderBy: asc(project.name) }),
    db.query.roleDefinition.findMany({ orderBy: asc(roleDefinition.name) }),
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
      <h1 className="text-2xl font-semibold">Nowy członek</h1>
      <MemberForm
        mode="create"
        fullAccess
        sections={sections}
        projects={projects}
        roleDefinitions={roleDefinitions}
        defaultValues={defaultValues}
      />
    </div>
  );
}
