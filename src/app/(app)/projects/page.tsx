import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { project } from "@/db/schema/projects";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

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
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Projekty</h1>
        {permissions !== null && can(permissions, "projects", "write") ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/projects/new">
              <Plus />
              Nowy projekt
            </Link>
          </Button>
        ) : null}
      </div>

      <ProjectsBrowser projects={projects} />
    </div>
  );
}
