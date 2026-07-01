"use server";

import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { member, memberEmail } from "@/db/schema/members";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { memberSection } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { reattributeActivityForMember } from "@/lib/integrations/github-activity";
import { runOnboardingAutomations } from "@/lib/onboarding";
import {
  canEditOwnProfile,
  canManageMembers,
  getMemberPermissions,
} from "@/lib/permissions";
import { memberFormSchema } from "@/lib/schemas/members";
import type { MemberFormValues } from "@/lib/schemas/members";

export async function createMember(input: MemberFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!canManageMembers(permissions)) {
    throw new Error("Tylko zarząd może dodawać nowych członków.");
  }

  const values = memberFormSchema.parse(input);

  const [created] = await db
    .insert(member)
    .values({
      fullName: values.fullName,
      githubUsername: emptyToNull(values.githubUsername),
      discordId: emptyToNull(values.discordId),
      facebookUrl: emptyToNull(values.facebookUrl),
      studentIndex: emptyToNull(values.studentIndex),
      studyDepartment: emptyToNull(values.studyDepartment),
      studyField: emptyToNull(values.studyField),
      studyYear: emptyToNull(values.studyYear),
      bio: emptyToNull(values.bio),
      hrNotes: emptyToNull(values.hrNotes),
      status: values.status,
    })
    .returning();

  if (values.emails.length > 0) {
    await db.insert(memberEmail).values(
      values.emails.map((email) => ({
        memberId: created.id,
        email: normalizeEmail(email.email),
        kind: email.kind,
      })),
    );
  }

  if (values.sectionIds.length > 0) {
    await db.insert(memberSection).values(
      values.sectionIds.map((sectionId) => ({
        memberId: created.id,
        sectionId,
      })),
    );
  }

  if (values.roleAssignments.length > 0) {
    const roleDefinitions = await db.query.roleDefinition.findMany({
      where: inArray(
        roleDefinition.id,
        values.roleAssignments.map((role) => role.roleDefinitionId),
      ),
    });
    const roleDefinitionById = new Map(
      roleDefinitions.map((role) => [role.id, role]),
    );

    await db.insert(roleAssignment).values(
      values.roleAssignments.map((role) => {
        const definition = roleDefinitionById.get(role.roleDefinitionId);
        if (definition === undefined) {
          throw new Error("Nie znaleziono wybranej roli.");
        }
        if (definition.scope === "project") {
          throw new Error(
            "Role projektowe są zarządzane w zespołach projektu.",
          );
        }
        return {
          memberId: created.id,
          roleDefinitionId: role.roleDefinitionId,
          sectionId:
            definition.scope === "section" ? (role.sectionId ?? null) : null,
          projectId: null,
          startedAt: parseDate(role.startedAt) ?? new Date(),
          endedAt: parseDate(role.endedAt),
        };
      }),
    );
  }

  if (created.githubUsername !== null) {
    await reattributeActivityForMember(created.id, created.githubUsername);
  }

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
  const query =
    resultParameters.size > 0 ? `?${resultParameters.toString()}` : "";

  redirect(`/members/${created.id}${query}`);
}

export async function updateMember(
  memberId: string,
  input: Partial<MemberFormValues>,
) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  const isFullAccess = canManageMembers(permissions);
  const isSelf = canEditOwnProfile(permissions, memberId);
  if (!isFullAccess && !isSelf) {
    throw new Error("Brak uprawnień do edycji tego profilu.");
  }

  const values = memberFormSchema.partial().parse(input);

  // fullName, status, bio, HR notes, emails, sectionIds and roles are board-only;
  // everything else (socials + study data) is self-editable per FEATURES.md.
  await db
    .update(member)
    .set({
      ...(isFullAccess &&
        values.fullName !== undefined && {
          fullName: values.fullName,
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
        values.hrNotes !== undefined && {
          hrNotes: emptyToNull(values.hrNotes),
        }),
      ...(isFullAccess &&
        values.status !== undefined && {
          status: values.status,
        }),
      updatedAt: new Date(),
    })
    .where(eq(member.id, memberId));

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

  if (isFullAccess && values.sectionIds !== undefined) {
    await db.delete(memberSection).where(eq(memberSection.memberId, memberId));
    if (values.sectionIds.length > 0) {
      await db
        .insert(memberSection)
        .values(
          values.sectionIds.map((sectionId) => ({ memberId, sectionId })),
        );
    }
  }

  if (isFullAccess && values.roleAssignments !== undefined) {
    await db
      .delete(roleAssignment)
      .where(eq(roleAssignment.memberId, memberId));
    if (values.roleAssignments.length > 0) {
      const roleDefinitions = await db.query.roleDefinition.findMany({
        where: inArray(
          roleDefinition.id,
          values.roleAssignments.map((role) => role.roleDefinitionId),
        ),
      });
      const roleDefinitionById = new Map(
        roleDefinitions.map((role) => [role.id, role]),
      );

      await db.insert(roleAssignment).values(
        values.roleAssignments.map((role) => {
          const definition = roleDefinitionById.get(role.roleDefinitionId);
          if (definition === undefined) {
            throw new Error("Nie znaleziono wybranej roli.");
          }
          if (definition.scope === "project") {
            throw new Error(
              "Role projektowe są zarządzane w zespołach projektu.",
            );
          }
          return {
            memberId,
            roleDefinitionId: role.roleDefinitionId,
            sectionId:
              definition.scope === "section" ? (role.sectionId ?? null) : null,
            projectId: null,
            startedAt: parseDate(role.startedAt) ?? new Date(),
            endedAt: parseDate(role.endedAt),
          };
        }),
      );
    }
  }

  if (values.githubUsername !== undefined) {
    const githubUsername = emptyToNull(values.githubUsername);
    if (githubUsername !== null) {
      await reattributeActivityForMember(memberId, githubUsername);
    }
  }

  redirect(`/members/${memberId}`);
}

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
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
