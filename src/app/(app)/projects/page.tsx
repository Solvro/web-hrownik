import { asc } from "drizzle-orm";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { project } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { getMemberPermissions } from "@/lib/permissions";

export default async function ProjectsPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  const projects = await db.query.project.findMany({
    orderBy: asc(project.name),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projekty</h1>
        {permissions?.isBoard === true ? (
          <Button asChild>
            <Link href="/projects/new">Nowy projekt</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((projectRow) => (
          <Link
            key={projectRow.id}
            href={`/projects/${projectRow.id}`}
            className="hover:bg-accent rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{projectRow.name}</h2>
              <Badge
                variant={
                  projectRow.status === "active" ? "default" : "secondary"
                }
              >
                {projectRow.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {projectRow.visibility === "public" ? "publiczny" : "wewnętrzny"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
