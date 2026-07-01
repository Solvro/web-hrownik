import type { Octokit } from "@octokit/rest";
import { and, desc, eq, gte, ilike, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";

import { getGithubOctokit } from "./github";

const DEFAULT_LOOKBACK_DAYS = 90;

export function isBotLogin(login: string): boolean {
  return login.toLowerCase().endsWith("[bot]");
}

/**
 * Rows written before the `title` column existed have no stored commit
 * message / PR / issue title — fall back to a generic label for those.
 */
export function fallbackActivityTitle(event: {
  type: "commit" | "pull_request" | "issue";
  externalId: string;
}): string {
  switch (event.type) {
    case "commit": {
      return `Commit ${event.externalId.slice(0, 7)}`;
    }
    case "pull_request": {
      return `Pull request #${event.externalId}`;
    }
    case "issue": {
      return `Issue #${event.externalId}`;
    }
  }
}

interface RepoRef {
  id: string;
  projectId: string;
  githubRepoFullName: string;
}

interface NewActivityEvent {
  projectRepositoryId: string;
  projectId: string;
  memberId: string | null;
  githubLogin: string;
  type: "commit" | "pull_request" | "issue";
  externalId: string;
  occurredAt: Date;
  url: string;
  title: string;
}

async function getMemberIdByGithubLogin(): Promise<Map<string, string>> {
  const membersWithGithub = await db.query.member.findMany({
    where: isNotNull(member.githubUsername),
    columns: { id: true, githubUsername: true },
  });
  return new Map(
    membersWithGithub
      .filter(
        (row): row is typeof row & { githubUsername: string } =>
          row.githubUsername !== null,
      )
      .map((row) => [row.githubUsername.toLowerCase(), row.id]),
  );
}

/**
 * Activity events are attributed to a member at insert time only (sync /
 * webhook). If a member's GitHub username is added or changed after their
 * events were already recorded — e.g. their profile is created well after
 * the initial project backfill — those existing rows are stuck with
 * memberId = null forever unless explicitly re-attributed here.
 */
export async function reattributeActivityForMember(
  memberId: string,
  githubUsername: string,
): Promise<number> {
  const updated = await db
    .update(githubActivityEvent)
    .set({ memberId })
    .where(
      and(
        isNull(githubActivityEvent.memberId),
        ilike(githubActivityEvent.githubLogin, githubUsername),
      ),
    )
    .returning({ id: githubActivityEvent.id });
  return updated.length;
}

async function getSinceDate(repoId: string): Promise<Date> {
  const lastEvent = await db.query.githubActivityEvent.findFirst({
    where: eq(githubActivityEvent.projectRepositoryId, repoId),
    orderBy: desc(githubActivityEvent.occurredAt),
  });
  if (lastEvent !== undefined) {
    return lastEvent.occurredAt;
  }
  return new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
}

export async function syncProjectRepositoryActivity(
  repo: RepoRef,
  octokit: Octokit,
  memberIdByLogin: Map<string, string>,
): Promise<number> {
  const [owner, repoName] = repo.githubRepoFullName.split("/");

  const since = await getSinceDate(repo.id);
  const events: NewActivityEvent[] = [];

  const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
    owner,
    repo: repoName,
    since: since.toISOString(),
    per_page: 100,
  });
  for (const commit of commits) {
    const login = commit.author?.login ?? commit.commit.author?.name ?? null;
    if (login === null || isBotLogin(login)) {
      continue;
    }
    const occurredAt =
      commit.commit.author?.date ?? commit.commit.committer?.date;
    events.push({
      projectRepositoryId: repo.id,
      projectId: repo.projectId,
      memberId: memberIdByLogin.get(login.toLowerCase()) ?? null,
      githubLogin: login,
      type: "commit",
      externalId: commit.sha,
      occurredAt: occurredAt === undefined ? new Date() : new Date(occurredAt),
      url: commit.html_url,
      title: commit.commit.message.split("\n")[0] ?? commit.commit.message,
    });
  }

  // issues.listForRepo returns both issues and PRs — items with a
  // `pull_request` key are PRs, so one call covers both event types.
  const issuesAndPrs = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo: repoName,
    state: "all",
    since: since.toISOString(),
    per_page: 100,
  });
  for (const item of issuesAndPrs) {
    const login = item.user?.login ?? null;
    if (login === null || isBotLogin(login)) {
      continue;
    }
    events.push({
      projectRepositoryId: repo.id,
      projectId: repo.projectId,
      memberId: memberIdByLogin.get(login.toLowerCase()) ?? null,
      githubLogin: login,
      type: item.pull_request === undefined ? "issue" : "pull_request",
      externalId: String(item.number),
      occurredAt: new Date(item.created_at),
      url: item.html_url,
      title: item.title,
    });
  }

  if (events.length > 0) {
    await db.insert(githubActivityEvent).values(events).onConflictDoNothing();
  }

  return events.length;
}

export interface SyncResult {
  repo: string;
  eventsFetched?: number;
  error?: string;
}

/**
 * On-demand REST backfill for a known set of repos — used right after a
 * repo is linked to a project (so its history isn't empty until the next
 * webhook event) and from the manual "Synchronizuj aktywność" button.
 * Ongoing activity otherwise arrives via /api/webhooks/github.
 */
export async function syncRepositories(
  repos: RepoRef[],
): Promise<SyncResult[]> {
  if (repos.length === 0) {
    return [];
  }

  let octokit;
  try {
    octokit = await getGithubOctokit();
  } catch (error) {
    console.warn("Failed to resolve GitHub App installation:", error);
    const message = error instanceof Error ? error.message : String(error);
    return repos.map((repo) => ({
      repo: repo.githubRepoFullName,
      error: message,
    }));
  }
  if (octokit === null) {
    return repos.map((repo) => ({
      repo: repo.githubRepoFullName,
      error: "GitHub integration is not configured.",
    }));
  }

  const memberIdByLogin = await getMemberIdByGithubLogin();

  const results: SyncResult[] = [];
  for (const repo of repos) {
    try {
      const eventsFetched = await syncProjectRepositoryActivity(
        repo,
        octokit,
        memberIdByLogin,
      );
      results.push({ repo: repo.githubRepoFullName, eventsFetched });
    } catch (error) {
      console.warn(
        `Failed to sync activity for ${repo.githubRepoFullName}:`,
        error,
      );
      results.push({
        repo: repo.githubRepoFullName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

export interface DailyActivityCount {
  date: string;
  count: number;
}

export async function getProjectDailyActivity(
  projectId: string,
  since: Date,
): Promise<DailyActivityCount[]> {
  return db
    .select({
      date: sql<string>`to_char(${githubActivityEvent.occurredAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(githubActivityEvent)
    .where(
      and(
        eq(githubActivityEvent.projectId, projectId),
        gte(githubActivityEvent.occurredAt, since),
      ),
    )
    .groupBy(sql`to_char(${githubActivityEvent.occurredAt}, 'YYYY-MM-DD')`);
}

export async function getMemberDailyActivity(
  memberId: string,
  since: Date,
): Promise<DailyActivityCount[]> {
  return db
    .select({
      date: sql<string>`to_char(${githubActivityEvent.occurredAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(githubActivityEvent)
    .where(
      and(
        eq(githubActivityEvent.memberId, memberId),
        gte(githubActivityEvent.occurredAt, since),
      ),
    )
    .groupBy(sql`to_char(${githubActivityEvent.occurredAt}, 'YYYY-MM-DD')`);
}

export interface ContributorRankingEntry {
  memberId: string | null;
  fullName: string | null;
  githubLogin: string;
  eventCount: number;
}

export async function getContributorRanking(
  projectId: string,
  since: Date,
  limit = 5,
): Promise<ContributorRankingEntry[]> {
  return db
    .select({
      memberId: githubActivityEvent.memberId,
      githubLogin: githubActivityEvent.githubLogin,
      fullName: member.fullName,
      eventCount: sql<number>`count(*)::int`,
    })
    .from(githubActivityEvent)
    .leftJoin(member, eq(githubActivityEvent.memberId, member.id))
    .where(
      and(
        eq(githubActivityEvent.projectId, projectId),
        gte(githubActivityEvent.occurredAt, since),
      ),
    )
    .groupBy(
      githubActivityEvent.memberId,
      githubActivityEvent.githubLogin,
      member.fullName,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}
