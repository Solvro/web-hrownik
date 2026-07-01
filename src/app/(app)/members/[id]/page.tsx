import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { deleteMember } from "@/actions/members";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { DeleteButton } from "@/components/delete-button";
import { RoleManager } from "@/components/members/role-manager";
import { MemberStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  canEditOwnProfile,
  canManageMembers,
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
      teamMemberships: { with: { team: { with: { project: true } } } },
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
  const canEdit =
    permissions !== null &&
    (canManageMembers(permissions) || canEditOwnProfile(permissions, id));
  const canManageRoles = permissions !== null && canManageMembers(permissions);
  const canViewHrNotes = canManageRoles;

  const [roleDefinitions, sections] = canManageRoles
    ? await Promise.all([
        db.query.roleDefinition.findMany({ orderBy: asc(roleDefinition.name) }),
        db.query.section.findMany({ orderBy: asc(section.name) }),
      ])
    : [[], []];

  return (
    <div className="max-w-2xl space-y-8">
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
          {profile.bio !== null && (
            <p className="text-muted-foreground">{profile.bio}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/members/${id}/edit`}>Edytuj</Link>
            </Button>
          ) : null}
          {canManageRoles ? (
            <DeleteButton
              action={deleteMember.bind(null, id)}
              confirmMessage={`Na pewno usunąć ${profile.fullName}? Tej operacji nie można cofnąć.`}
            >
              Usuń członka
            </DeleteButton>
          ) : null}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Dane</h2>
        <dl className="text-sm">
          <Row label="GitHub" value={profile.githubUsername} />
          <Row label="Discord" value={profile.discordId} />
          <Row label="Facebook" value={profile.facebookUrl} />
          <Row
            label="Status"
            value={<MemberStatusBadge status={profile.status} />}
          />
          <Row label="Indeks" value={profile.studentIndex} />
          <Row label="Wydział" value={profile.studyDepartment} />
          <Row label="Kierunek" value={profile.studyField} />
          <Row label="Rok" value={profile.studyYear} />
        </dl>
        {profile.parent === null ? null : (
          <div className="flex justify-between border-b py-1.5 text-sm last:border-0">
            <dt className="text-muted-foreground">Rodzic</dt>
            <dd>
              <Link
                href={`/members/${profile.parent.id}`}
                className="hover:underline"
              >
                {profile.parent.fullName}
              </Link>
            </dd>
          </div>
        )}
      </section>

      {canViewHrNotes ? (
        <section className="space-y-2">
          <h2 className="font-medium">Notatki HR</h2>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {profile.hrNotes ?? "—"}
          </p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Adresy e-mail</h2>
        <ul className="text-sm">
          {profile.emails.map((email) => (
            <li key={email.id}>
              {email.email}{" "}
              <Badge variant="outline">
                {email.kind === "login" ? "logowanie" : "powiadomienia"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Sekcje</h2>
        <div className="flex flex-wrap gap-1">
          {profile.sections.map((membership) => (
            <Badge key={membership.id} variant="outline">
              {membership.section.name}
            </Badge>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Aktywność na GitHubie</h2>
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-sm font-medium">
            Aktywność &middot; cała historia
          </h3>
          <ContributionHeatmap counts={dailyActivity} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">
              Ostatnia aktywność
            </h3>
            {hasMoreActivity ? (
              <Link
                href={`/members/${id}/activity`}
                className="text-sm hover:underline"
              >
                Zobacz całą aktywność →
              </Link>
            ) : null}
          </div>
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
        </div>
      </section>

      {canManageRoles ? (
        <section className="space-y-2">
          <h2 className="font-medium">Zarządzaj rolami</h2>
          <RoleManager
            memberId={id}
            activeRoles={roles
              .filter((assignment) => assignment.endedAt === null)
              .map((assignment) => ({
                id: assignment.id,
                roleDefinitionName: assignment.roleDefinition.name,
                targetLabel:
                  assignment.section?.name ?? assignment.project?.name ?? null,
              }))}
            roleDefinitions={roleDefinitions}
            sections={sections}
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Projekty</h2>
        <ul className="space-y-2">
          {profile.teamMemberships
            .toSorted((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
            .map((membership) => (
              <li key={membership.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  <Link
                    href={`/projects/${membership.team.project.id}`}
                    className="hover:underline"
                  >
                    {membership.team.project.name}
                  </Link>
                </div>
                <div className="text-muted-foreground">
                  {membership.team.name} · {membership.role}
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
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Historia ról organizacyjnych</h2>
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
      </section>
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
