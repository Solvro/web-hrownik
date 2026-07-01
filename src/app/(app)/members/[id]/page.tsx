import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/activity-timeline";
import { RoleManager } from "@/components/members/role-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project } from "@/db/schema/projects";
import { roleAssignment, roleDefinition } from "@/db/schema/roles";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import {
  canEditOwnProfile,
  canManageMembers,
  getMemberPermissions,
} from "@/lib/permissions";

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
    },
  });
  if (profile === undefined) {
    notFound();
  }

  const roles = await db.query.roleAssignment.findMany({
    where: eq(roleAssignment.memberId, id),
    orderBy: desc(roleAssignment.startedAt),
    with: { roleDefinition: true, section: true, project: true },
  });

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.memberId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: 100,
    with: { project: true },
  });
  const activityByProject = new Map<
    string,
    { projectName: string; events: typeof activityEvents }
  >();
  for (const event of activityEvents) {
    const bucket = activityByProject.get(event.projectId);
    if (bucket === undefined) {
      activityByProject.set(event.projectId, {
        projectName: event.project.name,
        events: [event],
      });
    } else {
      bucket.events.push(event);
    }
  }

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canEdit =
    permissions !== null &&
    (canManageMembers(permissions) || canEditOwnProfile(permissions, id));
  const canManageRoles = permissions !== null && canManageMembers(permissions);

  const [roleDefinitions, sections, projects] = canManageRoles
    ? await Promise.all([
        db.query.roleDefinition.findMany({ orderBy: asc(roleDefinition.name) }),
        db.query.section.findMany({ orderBy: asc(section.name) }),
        db.query.project.findMany({ orderBy: asc(project.name) }),
      ])
    : [[], [], []];

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
        {canEdit ? (
          <Button asChild variant="outline">
            <Link href={`/members/${id}/edit`}>Edytuj</Link>
          </Button>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Dane</h2>
        <dl className="text-sm">
          <Row label="GitHub" value={profile.githubUsername} />
          <Row label="Discord" value={profile.discordId} />
          <Row label="Facebook" value={profile.facebookUrl} />
          <Row label="Indeks" value={profile.studentIndex} />
          <Row label="Kierunek" value={profile.studyField} />
          <Row
            label="Rok / semestr"
            value={
              profile.studyYear === null && profile.studySemester === null
                ? null
                : `${profile.studyYear ?? "?"} / ${profile.studySemester ?? "?"}`
            }
          />
        </dl>
      </section>

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

      <section className="space-y-3">
        <h2 className="font-medium">Aktywność na GitHubie</h2>
        {activityByProject.size === 0 ? (
          <p className="text-muted-foreground text-sm">Brak aktywności.</p>
        ) : (
          [...activityByProject.entries()].map(([projectId, bucket]) => (
            <div key={projectId} className="space-y-1">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm font-medium hover:underline"
              >
                {bucket.projectName}
              </Link>
              <ActivityTimeline
                items={bucket.events.map((event) => ({
                  id: event.id,
                  type: event.type,
                  url: event.url,
                  occurredAt: event.occurredAt,
                  githubLogin: event.githubLogin,
                }))}
              />
            </div>
          ))
        )}
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
            projects={projects}
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Historia ról</h2>
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

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
