import type {
  IssuesEvent,
  PullRequestEvent,
  PushEvent,
} from "@octokit/webhooks-types";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { db } from "@/db";
import { githubActivityEvent, projectRepository } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { env } from "@/env";
import { isBotLogin } from "@/lib/integrations/github-activity";

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (signatureHeader === null) {
    return false;
  }
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

async function resolveRepo(fullName: string) {
  return db.query.projectRepository.findFirst({
    where: eq(projectRepository.githubRepoFullName, fullName),
  });
}

async function resolveMemberId(login: string): Promise<string | null> {
  const row = await db.query.member.findFirst({
    where: eq(member.githubUsername, login),
  });
  return row?.id ?? null;
}

async function handlePush(payload: PushEvent) {
  const repo = await resolveRepo(payload.repository.full_name);
  if (repo === undefined) {
    return;
  }

  const events = [];
  for (const commit of payload.commits) {
    const login = commit.author.username ?? commit.author.name;
    if (isBotLogin(login)) {
      continue;
    }
    events.push({
      projectRepositoryId: repo.id,
      projectId: repo.projectId,
      memberId: await resolveMemberId(login),
      githubLogin: login,
      type: "commit" as const,
      externalId: commit.id,
      occurredAt: new Date(commit.timestamp),
      url: commit.url,
    });
  }

  if (events.length > 0) {
    await db.insert(githubActivityEvent).values(events).onConflictDoNothing();
  }
}

async function handlePullRequest(payload: PullRequestEvent) {
  if (payload.action !== "opened") {
    return;
  }
  const repo = await resolveRepo(payload.repository.full_name);
  if (repo === undefined) {
    return;
  }

  const login = payload.pull_request.user.login;
  if (isBotLogin(login)) {
    return;
  }

  await db
    .insert(githubActivityEvent)
    .values({
      projectRepositoryId: repo.id,
      projectId: repo.projectId,
      memberId: await resolveMemberId(login),
      githubLogin: login,
      type: "pull_request",
      externalId: String(payload.pull_request.number),
      occurredAt: new Date(payload.pull_request.created_at),
      url: payload.pull_request.html_url,
    })
    .onConflictDoNothing();
}

async function handleIssue(payload: IssuesEvent) {
  if (payload.action !== "opened") {
    return;
  }
  const repo = await resolveRepo(payload.repository.full_name);
  if (repo === undefined) {
    return;
  }

  const login = payload.issue.user.login;
  if (isBotLogin(login)) {
    return;
  }

  await db
    .insert(githubActivityEvent)
    .values({
      projectRepositoryId: repo.id,
      projectId: repo.projectId,
      memberId: await resolveMemberId(login),
      githubLogin: login,
      type: "issue",
      externalId: String(payload.issue.number),
      occurredAt: new Date(payload.issue.created_at),
      url: payload.issue.html_url,
    })
    .onConflictDoNothing();
}

export async function POST(request: Request) {
  if (env.GITHUB_WEBHOOK_SECRET === undefined) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_SECRET is not configured on the server." },
      { status: 501 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";
  const payload: unknown = JSON.parse(rawBody);

  switch (event) {
    case "push": {
      await handlePush(payload as PushEvent);
      break;
    }
    case "pull_request": {
      await handlePullRequest(payload as PullRequestEvent);
      break;
    }
    case "issues": {
      await handleIssue(payload as IssuesEvent);
      break;
    }
    default: {
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
