import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/activity-timeline";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { NewTeamForm } from "@/components/projects/new-team-form";
import { SyncActivityButton } from "@/components/projects/sync-activity-button";
import { TeamPanel } from "@/components/projects/team-panel";
import { Badge } from "@/components/ui/badge";
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
import { canManageProject, getMemberPermissions } from "@/lib/permissions";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_PREVIEW_LIMIT = 5;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, id),
    with: {
      repositories: true,
      teams: { with: { members: { with: { member: true } } } },
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

  const now = Date.now();
  const [weeklyRanking, monthlyRanking, dailyActivity] = await Promise.all([
    getContributorRanking(id, new Date(now - 7 * DAY_MS)),
    getContributorRanking(id, new Date(now - 30 * DAY_MS)),
    getProjectDailyActivity(id, new Date(now - 371 * DAY_MS)),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{projectRow.name}</h1>
          <Badge
            variant={projectRow.status === "active" ? "default" : "secondary"}
          >
            {projectRow.status}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {projectRow.visibility === "public" ? "publiczny" : "wewnętrzny"}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Linki</h2>
        <dl className="text-sm">
          <LinkRow label="Produkcja" url={projectRow.productionUrl} />
          <LinkRow label="Google Drive" url={projectRow.driveFolderUrl} />
          <LinkRow label="Sprawozdanie" url={projectRow.reportDriveUrl} />
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
          <RankingList title="Ostatni tydzień" entries={weeklyRanking} />
          <RankingList title="Ostatni miesiąc" entries={monthlyRanking} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Aktywność</h2>
          {canManage ? <SyncActivityButton projectId={id} /> : null}
        </div>
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-sm font-medium">
            Aktywność &middot; ostatnie 12 miesięcy
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
              subtitle: `${event.member?.fullName ?? event.githubLogin} · ${event.projectRepository.githubRepoFullName}`,
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
              }))}
              availableMembers={
                canManage
                  ? allMembers.filter(
                      (memberRow) =>
                        !teamRow.members.some(
                          (teamMembership) =>
                            teamMembership.memberId === memberRow.id,
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
}: {
  title: string;
  entries: {
    memberId: string | null;
    fullName: string | null;
    githubLogin: string;
    eventCount: number;
  }[];
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
                  (entry.fullName ?? entry.githubLogin)
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
