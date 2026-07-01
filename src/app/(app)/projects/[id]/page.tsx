import { asc, desc, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProject } from "@/actions/projects";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DeleteButton } from "@/components/delete-button";
import { NewTeamForm } from "@/components/projects/new-team-form";
import { ProjectActivityPanel } from "@/components/projects/project-activity-panel";
import { TeamPanel } from "@/components/projects/team-panel";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { project } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import {
  fallbackActivityTitle,
  getContributorRanking,
  getProjectDailyActivity,
} from "@/lib/integrations/github-activity";
import {
  canManageMembers,
  canManageProject,
  getMemberPermissions,
} from "@/lib/permissions";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_PREVIEW_LIMIT = 5;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ingestActivity?: string }>;
}) {
  const { id } = await params;
  const { ingestActivity } = await searchParams;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, id),
    with: {
      repositories: true,
      teams: {
        with: {
          members: { with: { member: true } },
          repositories: { with: { projectRepository: true } },
        },
      },
    },
  });
  if (projectRow === undefined) {
    notFound();
  }

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManage = permissions !== null && canManageProject(permissions, id);
  const canAddMembers = permissions !== null && canManageMembers(permissions);
  const allMembers = canManage
    ? await db.query.member.findMany({ orderBy: asc(member.fullName) })
    : [];

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.projectId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: RECENT_ACTIVITY_PREVIEW_LIMIT + 1,
    with: { member: true, projectRepository: true },
  });
  const hasMoreActivity = activityEvents.length > RECENT_ACTIVITY_PREVIEW_LIMIT;
  const recentActivity = activityEvents.slice(0, RECENT_ACTIVITY_PREVIEW_LIMIT);
  const teamOptions = projectRow.teams.map((teamRow) => ({
    id: teamRow.id,
    name: teamRow.name,
  }));
  const activeProjectMemberIds = new Set(
    projectRow.teams.flatMap((teamRow) =>
      teamRow.members
        .filter((teamMembership) => teamMembership.leftAt === null)
        .map((teamMembership) => teamMembership.memberId),
    ),
  );

  const now = Date.now();
  const [weeklyRanking, monthlyRanking, dailyActivity] = await Promise.all([
    getContributorRanking(id, new Date(now - 7 * DAY_MS)),
    getContributorRanking(id, new Date(now - 30 * DAY_MS)),
    getProjectDailyActivity(id),
  ]);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{projectRow.name}</h1>
            <ProjectStatusBadge status={projectRow.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {projectRow.visibility === "public" ? "publiczny" : "wewnętrzny"}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage ? (
            <Button asChild variant="outline">
              <Link href={`/projects/${id}/edit`}>
                <Pencil />
                Edytuj
              </Link>
            </Button>
          ) : null}
          {permissions?.isBoard === true ? (
            <DeleteButton
              action={deleteProject.bind(null, id)}
              confirmMessage={`Na pewno usunąć projekt "${projectRow.name}"? Tej operacji nie można cofnąć.`}
            >
              Usuń projekt
            </DeleteButton>
          ) : null}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Linki</h2>
        <dl className="text-sm">
          <LinkRow label="Produkcja" url={projectRow.productionUrl} />
          <LinkRow label="Google Drive" url={projectRow.driveFolderUrl} />
          {projectRow.status === "completed" ? (
            <LinkRow label="Sprawozdanie" url={projectRow.reportDriveUrl} />
          ) : (
            <LinkRow
              label="Karta projektu"
              url={projectRow.projectCardDriveUrl}
            />
          )}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Repozytoria</h2>
        <ul className="divide-y rounded-md border">
          {projectRow.repositories.map((repo) => (
            <li key={repo.id} className="p-2 text-sm">
              <Link
                href={`/projects/${id}/repos/${repo.id}`}
                className="hover:underline"
              >
                {repo.githubRepoFullName}
              </Link>
            </li>
          ))}
          {projectRow.repositories.length === 0 ? (
            <li className="text-muted-foreground p-2 text-sm">
              Brak podłączonych repozytoriów
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Ranking kontrybutorów</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RankingList
            title="Ostatni tydzień"
            entries={weeklyRanking}
            canAddMembers={canAddMembers}
          />
          <RankingList
            title="Ostatni miesiąc"
            entries={monthlyRanking}
            canAddMembers={canAddMembers}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Aktywność</h2>
        <ProjectActivityPanel
          projectId={id}
          canManage={canManage}
          counts={dailyActivity}
          autoSync={canManage ? ingestActivity === "1" : false}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">
              Ostatnia aktywność
            </h3>
            {hasMoreActivity ? (
              <Link
                href={`/projects/${id}/activity`}
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
              actorName: event.member?.fullName ?? event.githubLogin,
              actorHref:
                event.member === null
                  ? undefined
                  : `/members/${event.member.id}`,
              addMemberHref:
                canAddMembers && event.member === null
                  ? `/members/new?githubUsername=${encodeURIComponent(event.githubLogin)}`
                  : undefined,
              assignToTeam:
                canManage &&
                event.member !== null &&
                !activeProjectMemberIds.has(event.member.id)
                  ? {
                      projectId: id,
                      memberId: event.member.id,
                      teams: teamOptions,
                    }
                  : undefined,
              subtitle: event.projectRepository.githubRepoFullName,
            }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Zespoły</h2>
        {projectRow.teams.map((teamRow) => (
          <div key={teamRow.id} className="space-y-2 rounded-md border p-3">
            <h3 className="text-sm font-medium">{teamRow.name}</h3>
            <TeamPanel
              teamId={teamRow.id}
              canManage={canManage}
              members={teamRow.members.map((teamMembership) => ({
                teamMemberId: teamMembership.id,
                memberId: teamMembership.memberId,
                fullName: teamMembership.member.fullName,
                role: teamMembership.role,
                joinedAt: teamMembership.joinedAt,
                leftAt: teamMembership.leftAt,
              }))}
              repositories={projectRow.repositories.map((repo) => ({
                id: repo.id,
                name: repo.githubRepoFullName,
              }))}
              selectedRepositoryIds={teamRow.repositories.map(
                (repo) => repo.projectRepositoryId,
              )}
              availableMembers={
                canManage
                  ? allMembers.filter(
                      (memberRow) =>
                        !teamRow.members.some(
                          (teamMembership) =>
                            teamMembership.memberId === memberRow.id &&
                            teamMembership.leftAt === null,
                        ),
                    )
                  : []
              }
            />
          </div>
        ))}
        {canManage ? <NewTeamForm projectId={id} /> : null}
      </section>
    </div>
  );
}

function RankingList({
  title,
  entries,
  canAddMembers,
}: {
  title: string;
  entries: {
    memberId: string | null;
    fullName: string | null;
    githubLogin: string;
    eventCount: number;
  }[];
  canAddMembers: boolean;
}) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Brak aktywności.</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {entries.map((entry, index) => (
            <li
              key={entry.memberId ?? entry.githubLogin}
              className="flex justify-between"
            >
              <span>
                {index + 1}.{" "}
                {entry.memberId === null ? (
                  <span className="inline-flex items-center gap-2">
                    {entry.fullName ?? entry.githubLogin}
                    {canAddMembers ? (
                      <Link
                        href={`/members/new?githubUsername=${encodeURIComponent(entry.githubLogin)}`}
                        className="text-xs underline"
                      >
                        Dodaj członka
                      </Link>
                    ) : null}
                  </span>
                ) : (
                  <Link
                    href={`/members/${entry.memberId}`}
                    className="hover:underline"
                  >
                    {entry.fullName ?? entry.githubLogin}
                  </Link>
                )}
              </span>
              <span className="text-muted-foreground">{entry.eventCount}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {url === null ? (
          "—"
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {url}
          </a>
        )}
      </dd>
    </div>
  );
}
