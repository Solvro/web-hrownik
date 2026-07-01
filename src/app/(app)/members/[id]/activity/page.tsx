import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/activity-timeline";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { member } from "@/db/schema/members";
import { fallbackActivityTitle } from "@/lib/integrations/github-activity";

const ACTIVITY_LIMIT = 200;

export default async function MemberActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const memberRow = await db.query.member.findFirst({
    where: eq(member.id, id),
    columns: { id: true, fullName: true },
  });
  if (memberRow === undefined) {
    notFound();
  }

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.memberId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: ACTIVITY_LIMIT,
    with: { project: true, projectRepository: true },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link
          href={`/members/${id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {memberRow.fullName}
        </Link>
        <h1 className="text-2xl font-semibold">Aktywność</h1>
      </div>
      <ActivityTimeline
        items={activityEvents.map((event) => ({
          id: event.id,
          type: event.type,
          url: event.url,
          occurredAt: event.occurredAt,
          title: event.title ?? fallbackActivityTitle(event),
          subtitle: `${event.project.name} · ${event.projectRepository.githubRepoFullName}`,
        }))}
      />
    </div>
  );
}
