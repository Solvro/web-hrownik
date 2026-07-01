import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { deleteMember } from "@/actions/members";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DeleteButton } from "@/components/delete-button";
import { MemberActivityCard } from "@/components/members/member-activity-card";
import { MemberContactPills } from "@/components/members/member-contact-pills";
import { RoleManager } from "@/components/members/role-manager";
import { MemberStatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import {
  fallbackActivityTitle,
  getMemberDailyActivity,
} from "@/lib/integrations/github-activity";
import {
  can,
  canEditOwnProfile,
  getMemberPermissions,
} from "@/lib/permissions";

const RECENT_ACTIVITY_PREVIEW_LIMIT = 5;

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ githubInvited?: string; discordInvite?: string }>;
}) {
  const { id } = await params;
  const { githubInvited, discordInvite } = await searchParams;

  const profile = await db.query.member.findFirst({
    where: eq(member.id, id),
    with: {
      emails: true,
      sections: { with: { section: true } },
      teamMemberships: {
        with: { team: { with: { project: true } }, roleDefinition: true },
      },
      parent: true,
    },
  });
  if (profile === undefined) {
    notFound();
  }

  const roleAssignments = await db.query.roleAssignment.findMany({
    where: eq(roleAssignment.memberId, id),
    orderBy: desc(roleAssignment.startedAt),
    with: { roleDefinition: true, section: true, project: true },
  });
  const roles = roleAssignments.filter(
    (assignment) => assignment.roleDefinition.scope !== "project",
  );

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.memberId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: RECENT_ACTIVITY_PREVIEW_LIMIT + 1,
    with: { project: true, projectRepository: true },
  });
  const hasMoreActivity = activityEvents.length > RECENT_ACTIVITY_PREVIEW_LIMIT;
  const recentActivity = activityEvents.slice(0, RECENT_ACTIVITY_PREVIEW_LIMIT);
  const dailyActivity = await getMemberDailyActivity(id);

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManageMembers =
    permissions !== null && can(permissions, "members", "write");
  const canEdit =
    canManageMembers ||
    (permissions !== null && canEditOwnProfile(permissions, id));
  const canManageRoles =
    permissions !== null && can(permissions, "roles", "write");
  const canViewHrNotes = canManageMembers;

  const [roleDefinitions, sections] = canManageRoles
    ? await Promise.all([
        db.query.roleDefinition.findMany({ orderBy: asc(roleDefinition.name) }),
        db.query.section.findMany({ orderBy: asc(section.name) }),
      ])
    : [[], []];

  const initials = profile.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-5xl space-y-8">
      {githubInvited === "1" || discordInvite !== undefined ? (
        <div className="bg-muted/50 space-y-1 rounded-md border p-3 text-sm">
          <p className="font-medium">Onboarding — akcje do wykonania</p>
          {githubInvited === "1" ? (
            <p>Zaproszenie do organizacji GitHub zostało wysłane.</p>
          ) : null}
          {discordInvite === undefined ? null : (
            <p>
              Link zaproszenia na Discorda (jednorazowy, prześlij go nowemu
              członkowi):{" "}
              <a
                href={discordInvite}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {discordInvite}
              </a>
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-15 sm:size-20">
            {profile.photoUrl === null ? null : (
              <AvatarImage src={profile.photoUrl} alt={profile.fullName} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold wrap-break-word">
                {profile.fullName}
              </h1>
              <MemberStatusBadge status={profile.status} />
            </div>
            {profile.bio !== null && (
              <p className="text-muted-foreground">{profile.bio}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 min-[360px]:flex-row sm:flex-row">
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/members/${id}/edit`}>Edytuj</Link>
            </Button>
          ) : null}
          {canManageMembers ? (
            <DeleteButton
              action={deleteMember.bind(null, id)}
              confirmMessage={`Na pewno usunąć ${profile.fullName}? Tej operacji nie można cofnąć.`}
            >
              Usuń członka
            </DeleteButton>
          ) : null}
        </div>
      </div>

      <MemberContactPills
        githubUsername={profile.githubUsername}
        discordId={profile.discordId}
        facebookUrl={profile.facebookUrl}
        linkedinUrl={profile.linkedinUrl}
        instagramUrl={profile.instagramUrl}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="text-sm">
            <Row label="Indeks" value={profile.studentIndex} />
            <Row label="Wydział" value={profile.studyDepartment} />
            <Row label="Kierunek" value={profile.studyField} />
            <Row label="Rok" value={profile.studyYear} />
            {profile.parent === null ? null : (
              <Row
                label="Rodzic"
                value={
                  <Link
                    href={`/members/${profile.parent.id}`}
                    className="hover:underline"
                  >
                    {profile.parent.fullName}
                  </Link>
                }
              />
            )}
          </dl>
          {profile.sections.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {profile.sections.map((membership) => (
                <Badge key={membership.id} variant="outline">
                  {membership.section.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Adresy e-mail</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {profile.emails.map((email) => (
              <li key={email.id} className="flex items-center gap-2">
                {email.email}
                <Badge variant="outline">
                  {email.kind === "login" ? "logowanie" : "powiadomienia"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canViewHrNotes ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Notatki HR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {profile.hrNotes ?? "—"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <MemberActivityCard counts={dailyActivity} />

      <Card size="sm">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Ostatnia aktywność</CardTitle>
            {hasMoreActivity ? (
              <Link
                href={`/members/${id}/activity`}
                className="text-sm hover:underline"
              >
                Zobacz całą aktywność →
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            items={recentActivity.map((event) => ({
              id: event.id,
              type: event.type,
              url: event.url,
              occurredAt: event.occurredAt,
              title: event.title ?? fallbackActivityTitle(event),
              subtitle: `${event.project.name} · ${event.projectRepository.githubRepoFullName}`,
            }))}
          />
        </CardContent>
      </Card>

      {canManageRoles ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Zarządzaj rolami</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleManager
              memberId={id}
              activeRoles={roles
                .filter((assignment) => assignment.endedAt === null)
                .map((assignment) => ({
                  id: assignment.id,
                  roleDefinitionName: assignment.roleDefinition.name,
                  targetLabel:
                    assignment.section?.name ??
                    assignment.project?.name ??
                    null,
                }))}
              roleDefinitions={roleDefinitions}
              sections={sections}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Projekty</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {profile.teamMemberships
              .toSorted((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
              .map((membership) => (
                <li
                  key={membership.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="font-medium">
                    <Link
                      href={`/projects/${membership.team.project.id}`}
                      className="hover:underline"
                    >
                      {membership.team.project.name}
                    </Link>
                  </div>
                  <div className="text-muted-foreground">
                    {membership.team.name} · {membership.roleDefinition.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {membership.joinedAt.toLocaleDateString("pl-PL")} –{" "}
                    {membership.leftAt === null
                      ? "obecnie"
                      : membership.leftAt.toLocaleDateString("pl-PL")}
                  </div>
                </li>
              ))}
            {profile.teamMemberships.length === 0 ? (
              <li className="text-muted-foreground text-sm">Brak projektów</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Historia ról organizacyjnych</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {roles.map((assignment) => (
              <li key={assignment.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {assignment.roleDefinition.name}
                </div>
                <div className="text-muted-foreground">
                  {assignment.section === null ? null : (
                    <Link
                      href={`/sections/${assignment.section.id}`}
                      className="hover:underline"
                    >
                      {assignment.section.name}
                    </Link>
                  )}
                  {assignment.project === null ? null : (
                    <Link
                      href={`/projects/${assignment.project.id}`}
                      className="hover:underline"
                    >
                      {assignment.project.name}
                    </Link>
                  )}
                  {assignment.section === null && assignment.project === null
                    ? "Zarząd"
                    : null}
                </div>
                <div className="text-muted-foreground text-xs">
                  {assignment.startedAt.toLocaleDateString("pl-PL")} –{" "}
                  {assignment.endedAt === null
                    ? "obecnie"
                    : assignment.endedAt.toLocaleDateString("pl-PL")}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
