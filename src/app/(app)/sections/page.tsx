import { asc } from "drizzle-orm";
import Link from "next/link";

import { NewSectionDialog } from "@/components/sections/new-section-dialog";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";
import { declineNumeric } from "@/lib/polish";

export default async function SectionsPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  const sections = await db.query.section.findMany({
    orderBy: asc(section.name),
    with: { members: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Sekcje</h1>
        {permissions !== null && canManageMembers(permissions) ? (
          <NewSectionDialog />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sectionRow) => (
          <Link
            key={sectionRow.id}
            href={`/sections/${sectionRow.id}`}
            className="hover:bg-accent rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 font-medium break-words">
                {sectionRow.name}
              </h2>
              <Badge variant="secondary">
                {declineNumeric(sectionRow.members.length, "członek")}
              </Badge>
            </div>
            {sectionRow.description !== null && (
              <p className="text-muted-foreground mt-1 text-sm">
                {sectionRow.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
