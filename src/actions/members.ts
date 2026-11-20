"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { teamMember } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { reattributeActivityForMember } from "@/lib/integrations/github-activity";
import { getUniversityInfoOptionsOrEmpty } from "@/lib/integrations/topwr";
import { setMemberHrNote } from "@/lib/member-hr-notes";
import type {
  LegacyImportPreviewResult,
  MemberImportSheetType,
} from "@/lib/member-import/legacy";
import {
  commitLegacyImport,
  previewLegacyImport,
} from "@/lib/member-import/legacy";
import type {
  RecruitmentAnalysisResult,
  RecruitmentCommitResult,
} from "@/lib/member-import/recruitment";
import {
  analyzeRecruitmentFile,
  commitRecruitmentRows,
} from "@/lib/member-import/recruitment";
import type { ImportSummary } from "@/lib/member-import/summary";
import { createMemberRecord } from "@/lib/members/create-member";
import { runOnboardingAutomations } from "@/lib/onboarding";
import {
  can,
  canEditOwnProfile,
  getMemberPermissions,
} from "@/lib/permissions";
import type { RecruitmentCommitInput } from "@/lib/schemas/member-import";
import { memberFormSchema } from "@/lib/schemas/members";
import type {
  MemberFormValues,
  MemberImportCommitInput,
} from "@/lib/schemas/members";
import { revokeTeamAccess } from "@/lib/team-sync";
import { emptyToNull } from "@/lib/utils";

export async function createMember(input: MemberFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "members", "write")) {
    throw new Error("Tylko zarząd może dodawać nowych członków.");
  }

  const values = memberFormSchema.parse(input);

  const roleDefinitions =
    values.roleAssignments.length === 0
      ? []
      : await db.query.roleDefinition.findMany({
          where: inArray(
            roleDefinition.id,
            values.roleAssignments.map((role) => role.roleDefinitionId),
          ),
        });
  const roleDefinitionById = new Map(
    roleDefinitions.map((role) => [role.id, role]),
  );
  const roleAssignments = values.roleAssignments.map((role) => {
    const definition = roleDefinitionById.get(role.roleDefinitionId);
    if (definition === undefined) {
      throw new Error("Nie znaleziono wybranej roli.");
    }
    if (definition.scope === "project_team" || definition.scope === "project") {
      throw new Error("Role projektowe są zarządzane przy projekcie.");
    }
    if (
      definition.scope === "board" &&
      (role.boardTermId === undefined || role.boardTermId === "")
    ) {
      throw new Error("Rola zarządowa wymaga wskazania kadencji.");
    }
    return {
      roleDefinitionId: role.roleDefinitionId,
      boardTermId: definition.scope === "board" ? role.boardTermId : null,
      sectionId:
        definition.scope === "section" ? (role.sectionId ?? null) : null,
      projectId: null,
      startedAt: parseDate(role.startedAt) ?? new Date(),
      endedAt: parseDate(role.endedAt),
    };
  });

  const created = await db.transaction(async (tx) =>
    createMemberRecord(tx, {
      values: {
        fullName: values.fullName,
        parentId: emptyToNull(values.parentId),
        githubUsername: emptyToNull(values.githubUsername),
        discordId: emptyToNull(values.discordId),
        facebookUrl: emptyToNull(values.facebookUrl),
        linkedinUrl: emptyToNull(values.linkedinUrl),
        instagramUrl: emptyToNull(values.instagramUrl),
        websiteUrl: emptyToNull(values.websiteUrl),
        photoUrl: emptyToNull(values.photoUrl),
        studentIndex: emptyToNull(values.studentIndex),
        studyDepartment: emptyToNull(values.studyDepartment),
        studyField: emptyToNull(values.studyField),
        studyYear: emptyToNull(values.studyYear),
        bio: emptyToNull(values.bio),
        status: values.status,
      },
      hrNotes: emptyToNull(values.hrNotes),
      emails: values.emails,
      roleAssignments,
    }),
  );

  const automationResult = await runOnboardingAutomations({
    member: { githubUsername: created.githubUsername },
    sendGithubInvite: values.sendGithubInvite ?? true,
    sendDiscordInvite: values.sendDiscordInvite ?? true,
  });

  const resultParameters = new URLSearchParams();
  if (automationResult.githubInviteSent) {
    resultParameters.set("githubInvited", "1");
  }
  if (automationResult.discordInviteUrl !== null) {
    resultParameters.set("discordInvite", automationResult.discordInviteUrl);
  }

  revalidatePath(`/members/${created.id}`);
  revalidatePath("/members");

  return { id: created.id, query: resultParameters.toString() };
}

export async function updateMember(
  memberId: string,
  input: Partial<MemberFormValues>,
) {
  const startMs = Date.now();
  console.warn("[updateMember] start memberId=%s", memberId, {
    fieldCount: Object.keys(input).length,
    keys: Object.keys(input),
  });

  try {
    const currentMember = await getCurrentMember();
    if (currentMember === null) {
      throw new Error("Unauthorized");
    }
    const permissions = await getMemberPermissions(currentMember.id);
    const isFullAccess = can(permissions, "members", "write");
    const isSelf = canEditOwnProfile(permissions, memberId);
    if (!isFullAccess && !isSelf) {
      throw new Error("Brak uprawnień do edycji tego profilu.");
    }

    const values = memberFormSchema.partial().parse(input);

    if (values.parentId !== undefined && values.parentId === memberId) {
      throw new Error("Członek nie może być swoim własnym rodzicem.");
    }

    // fullName, status, bio, HR notes, emails and roles are board-only;
    // everything else (socials + study data) is self-editable per FEATURES.md.
    await db
      .update(member)
      .set({
        ...(isFullAccess &&
          values.fullName !== undefined && {
            fullName: values.fullName,
          }),
        ...(isFullAccess &&
          values.parentId !== undefined && {
            parentId: emptyToNull(values.parentId),
          }),
        ...(values.githubUsername !== undefined && {
          githubUsername: emptyToNull(values.githubUsername),
        }),
        ...(values.discordId !== undefined && {
          discordId: emptyToNull(values.discordId),
        }),
        ...(values.facebookUrl !== undefined && {
          facebookUrl: emptyToNull(values.facebookUrl),
        }),
        ...(values.linkedinUrl !== undefined && {
          linkedinUrl: emptyToNull(values.linkedinUrl),
        }),
        ...(values.instagramUrl !== undefined && {
          instagramUrl: emptyToNull(values.instagramUrl),
        }),
        ...(values.websiteUrl !== undefined && {
          websiteUrl: emptyToNull(values.websiteUrl),
        }),
        ...(values.photoUrl !== undefined && {
          photoUrl: emptyToNull(values.photoUrl),
        }),
        ...(values.studentIndex !== undefined && {
          studentIndex: emptyToNull(values.studentIndex),
        }),
        ...(values.studyDepartment !== undefined && {
          studyDepartment: emptyToNull(values.studyDepartment),
        }),
        ...(values.studyField !== undefined && {
          studyField: emptyToNull(values.studyField),
        }),
        ...(values.studyYear !== undefined && {
          studyYear: emptyToNull(values.studyYear),
        }),
        ...(isFullAccess &&
          values.bio !== undefined && {
            bio: emptyToNull(values.bio),
          }),
        ...(isFullAccess &&
          values.status !== undefined && {
            status: values.status,
          }),
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberId));

    if (isFullAccess && values.hrNotes !== undefined) {
      await setMemberHrNote(memberId, emptyToNull(values.hrNotes));
    }

    if (isFullAccess && values.emails !== undefined) {
      await db.delete(memberEmail).where(eq(memberEmail.memberId, memberId));
      if (values.emails.length > 0) {
        await db.insert(memberEmail).values(
          values.emails.map((email) => ({
            memberId,
            email: normalizeEmail(email.email),
            kind: email.kind,
          })),
        );
      }
    }

    if (isFullAccess && values.roleAssignments !== undefined) {
      const existingAssignments = await db.query.roleAssignment.findMany({
        where: eq(roleAssignment.memberId, memberId),
        with: { roleDefinition: true },
      });
      const replacedAssignmentIds = existingAssignments
        .filter(
          (assignment) =>
            assignment.roleDefinition.scope !== "project" &&
            assignment.roleDefinition.scope !== "project_team",
        )
        .map((assignment) => assignment.id);
      if (replacedAssignmentIds.length > 0) {
        await db
          .delete(roleAssignment)
          .where(inArray(roleAssignment.id, replacedAssignmentIds));
      }

      if (values.roleAssignments.length > 0) {
        const roleDefinitions =
          values.roleAssignments.length === 0
            ? []
            : await db.query.roleDefinition.findMany({
                where: inArray(
                  roleDefinition.id,
                  values.roleAssignments.map((role) => role.roleDefinitionId),
                ),
              });
        const roleDefinitionById = new Map(
          roleDefinitions.map((role) => [role.id, role]),
        );

        const assignments = values.roleAssignments.map((role) => {
          const definition = roleDefinitionById.get(role.roleDefinitionId);
          if (definition === undefined) {
            throw new Error("Nie znaleziono wybranej roli.");
          }
          if (
            definition.scope === "project_team" ||
            definition.scope === "project"
          ) {
            throw new Error("Role projektowe są zarządzane przy projekcie.");
          }
          if (
            definition.scope === "board" &&
            (role.boardTermId === undefined || role.boardTermId === "")
          ) {
            throw new Error("Rola zarządowa wymaga wskazania kadencji.");
          }
          return {
            memberId,
            roleDefinitionId: role.roleDefinitionId,
            boardTermId: definition.scope === "board" ? role.boardTermId : null,
            sectionId:
              definition.scope === "section" ? (role.sectionId ?? null) : null,
            projectId: null,
            startedAt: parseDate(role.startedAt) ?? new Date(),
            endedAt: parseDate(role.endedAt),
          };
        });
        if (assignments.length > 0) {
          await db.insert(roleAssignment).values(assignments);
        }
      }
    }

    if (values.githubUsername !== undefined) {
      const githubUsername = emptyToNull(values.githubUsername);
      if (githubUsername !== null) {
        await reattributeActivityForMember(memberId, githubUsername);
      }
    }

    revalidatePath(`/members/${memberId}`);
    revalidatePath("/members");

    console.warn(
      "[updateMember] success memberId=%s duration=%dms",
      memberId,
      Date.now() - startMs,
    );
  } catch (error) {
    console.error(
      "[updateMember] error memberId=%s duration=%dms",
      memberId,
      Date.now() - startMs,
      error,
    );
    throw error;
  }
}

export async function deleteMember(memberId: string): Promise<void> {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "members", "write")) {
    throw new Error("Tylko zarząd może usuwać członków.");
  }

  const memberRow = await db.query.member.findFirst({
    where: eq(member.id, memberId),
  });
  if (memberRow === undefined) {
    throw new Error("Nie znaleziono członka.");
  }

  const activeMemberships = await db.query.teamMember.findMany({
    where: and(eq(teamMember.memberId, memberId), isNull(teamMember.leftAt)),
    with: { team: true },
  });
  for (const membership of activeMemberships) {
    await revokeTeamAccess(membership.team, memberRow);
  }

  await db.delete(member).where(eq(member.id, memberId));
  revalidatePath("/members");
  redirect("/members");
}

/** Legacy: preview of a historical member sheet (CSV/TSV) import. */
export async function previewLegacyMemberImport(
  sheetType: MemberImportSheetType,
  fileContents: string,
): Promise<LegacyImportPreviewResult> {
  const currentMember = await getCurrentMember();
  return previewLegacyImport({
    actorMemberId: currentMember?.id ?? null,
    sheetType,
    fileContents,
  });
}

/** Legacy: creates the reviewed rows of a historical member sheet import. */
export async function commitLegacyMemberImport(
  rows: MemberImportCommitInput,
): Promise<ImportSummary> {
  const currentMember = await getCurrentMember();
  const summary = await commitLegacyImport({
    actorMemberId: currentMember?.id ?? null,
    rows,
  });
  revalidatePath("/members");
  return summary;
}

/**
 * Step 1–2 of the recruitment import: parse the uploaded Eventownik export
 * (FormData `file`, optional `mapping` override as JSON) into a column
 * mapping and editable preview rows. Nothing is written.
 */
export async function analyzeRecruitmentImport(
  formData: FormData,
): Promise<RecruitmentAnalysisResult> {
  const currentMember = await getCurrentMember();
  return analyzeRecruitmentFile({
    actorMemberId: currentMember?.id ?? null,
    file: formData.get("file"),
    mapping: formData.get("mapping") ?? undefined,
    university: await getUniversityInfoOptionsOrEmpty(),
  });
}

/** Final step of the recruitment import: create the reviewed rows. */
export async function commitRecruitmentImport(
  input: RecruitmentCommitInput,
): Promise<RecruitmentCommitResult> {
  const currentMember = await getCurrentMember();
  const result = await commitRecruitmentRows({
    actorMemberId: currentMember?.id ?? null,
    input,
    university: await getUniversityInfoOptionsOrEmpty(),
  });
  if (result.ok && result.summary.created > 0) {
    revalidatePath("/members");
  }
  return result;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}
