import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  getGithubUserProfile,
  isGithubConfigured,
} from "@/lib/integrations/github";

export async function GET() {
  if (!isGithubConfigured()) {
    return NextResponse.json({ invalidIds: [] });
  }

  const allMembers = await db.query.member.findMany({
    columns: { id: true, githubUsername: true },
  });

  const withGithub = allMembers.filter(
    (m): m is typeof m & { githubUsername: string } =>
      m.githubUsername !== null,
  );

  const checks = await Promise.allSettled(
    withGithub.map(async (m) => ({
      id: m.id,
      valid: (await getGithubUserProfile(m.githubUsername)) !== null,
    })),
  );

  const invalidIds = checks
    .filter(
      (r): r is PromiseFulfilledResult<{ id: string; valid: boolean }> =>
        r.status === "fulfilled" && !r.value.valid,
    )
    .map((r) => r.value.id);

  return NextResponse.json({ invalidIds });
}
