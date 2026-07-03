import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

import { env } from "@/env";

interface GithubConfig {
  appId: string;
  privateKey: string;
  org: string;
}

function getGithubConfig(): GithubConfig | null {
  if (
    env.GITHUB_APP_ID === undefined ||
    env.GITHUB_APP_PRIVATE_KEY === undefined ||
    env.GITHUB_ORG === undefined
  ) {
    return null;
  }
  return {
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll(
      String.raw`\n`,
      "\n",
    ).replaceAll(String.raw`\r`, ""),
    org: env.GITHUB_ORG,
  };
}

export function isGithubConfigured(): boolean {
  return getGithubConfig() !== null;
}

let cachedOctokit: Promise<Octokit> | null = null;

/**
 * Returns an Octokit instance authenticated as the GitHub App's installation
 * on GITHUB_ORG. Resolves the installation id via the app-level JWT instead
 * of requiring a separate env var.
 */
async function getOrgOctokit(config: GithubConfig): Promise<Octokit> {
  cachedOctokit ??= resolveOrgOctokit(config).catch((error: unknown) => {
    // Don't cache a failed resolution (e.g. app not installed on the org
    // yet) — retry on the next call instead of failing forever.
    cachedOctokit = null;
    throw error;
  });
  return cachedOctokit;
}

async function resolveOrgOctokit(config: GithubConfig): Promise<Octokit> {
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: config.appId, privateKey: config.privateKey },
  });

  const { data: installation } = await appOctokit.request(
    "GET /orgs/{org}/installation",
    { org: config.org },
  );

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId: installation.id,
    },
  });
}

export async function inviteMemberToOrg(githubUsername: string): Promise<void> {
  const config = getGithubConfig();
  if (config === null) {
    console.warn(
      `GitHub integration not configured, skipping org invite for ${githubUsername}`,
    );
    return;
  }

  const octokit = await getOrgOctokit(config);
  const { data: user } = await octokit.rest.users.getByUsername({
    username: githubUsername,
  });

  await octokit.rest.orgs.createInvitation({
    org: config.org,
    invitee_id: user.id,
  });
}

export async function addMemberToTeam(
  teamSlug: string,
  githubUsername: string,
): Promise<void> {
  const config = getGithubConfig();
  if (config === null) {
    console.warn(
      `GitHub integration not configured, skipping team add for ${githubUsername}`,
    );
    return;
  }

  const octokit = await getOrgOctokit(config);
  await octokit.rest.teams.addOrUpdateMembershipForUserInOrg({
    org: config.org,
    team_slug: teamSlug,
    username: githubUsername,
  });
}

export async function removeMemberFromTeam(
  teamSlug: string,
  githubUsername: string,
): Promise<void> {
  const config = getGithubConfig();
  if (config === null) {
    console.warn(
      `GitHub integration not configured, skipping team removal for ${githubUsername}`,
    );
    return;
  }

  const octokit = await getOrgOctokit(config);
  await octokit.rest.teams.removeMembershipForUserInOrg({
    org: config.org,
    team_slug: teamSlug,
    username: githubUsername,
  });
}

export interface OrgRepo {
  id: number;
  fullName: string;
}

export interface GithubUserProfile {
  login: string;
  name: string | null;
}

export async function getGithubUserProfile(
  username: string,
): Promise<GithubUserProfile | null> {
  const octokit = await getGithubOctokit();
  if (octokit === null) {
    return null;
  }

  try {
    const { data: user } = await octokit.rest.users.getByUsername({
      username,
    });
    return { login: user.login, name: user.name };
  } catch (error) {
    console.warn(`Failed to fetch GitHub profile for ${username}:`, error);
    return null;
  }
}

let repoCache: { repos: OrgRepo[]; timestamp: number } | null = null;
const REPO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function listOrgRepos(): Promise<OrgRepo[]> {
  if (repoCache !== null && Date.now() - repoCache.timestamp < REPO_CACHE_TTL) {
    return repoCache.repos;
  }

  const config = getGithubConfig();
  if (config === null) {
    return [];
  }

  try {
    const octokit = await getOrgOctokit(config);
    const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
      org: config.org,
      per_page: 100,
    });

    const mapped = repos.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
    }));
    repoCache = { repos: mapped, timestamp: Date.now() };
    return mapped;
  } catch (error) {
    console.warn("Failed to list GitHub org repos:", error);
    return [];
  }
}

export function clearOrgReposCache() {
  repoCache = null;
}

/** Shared org-installation Octokit instance for callers outside this module (e.g. activity sync). */
export async function getGithubOctokit(): Promise<Octokit | null> {
  const config = getGithubConfig();
  if (config === null) {
    return null;
  }
  return getOrgOctokit(config);
}

export interface RepoIssueOrPull {
  number: number;
  title: string;
  url: string;
  author: string;
  isPullRequest: boolean;
}

export async function listOpenIssuesAndPulls(
  githubRepoFullName: string,
): Promise<RepoIssueOrPull[]> {
  const octokit = await getGithubOctokit();
  if (octokit === null) {
    return [];
  }

  const [owner, repoName] = githubRepoFullName.split("/");

  try {
    const items = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo: repoName,
      state: "open",
      per_page: 100,
    });
    return items.map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
      author: item.user?.login ?? "unknown",
      isPullRequest: item.pull_request !== undefined,
    }));
  } catch (error) {
    console.warn(`Failed to list issues for ${githubRepoFullName}:`, error);
    return [];
  }
}
