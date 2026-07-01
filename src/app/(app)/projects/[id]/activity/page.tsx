import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/activity-timeline";
import { db } from "@/db";
import { githubActivityEvent } from "@/db/schema/github";
import { project } from "@/db/schema/projects";
import { fallbackActivityTitle } from "@/lib/integrations/github-activity";

const ACTIVITY_LIMIT = 200;

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, id),
    columns: { id: true, name: true },
  });
  if (projectRow === undefined) {
    notFound();
  }

  const activityEvents = await db.query.githubActivityEvent.findMany({
    where: eq(githubActivityEvent.projectId, id),
    orderBy: desc(githubActivityEvent.occurredAt),
    limit: ACTIVITY_LIMIT,
    with: { member: true, projectRepository: true },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link
          href={`/projects/${id}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {projectRow.name}
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
          subtitle: `${event.member?.fullName ?? event.githubLogin} · ${event.projectRepository.githubRepoFullName}`,
        }))}
      />
    </div>
  );
}
