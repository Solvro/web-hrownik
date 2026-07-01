import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { SectionForm } from "@/components/sections/section-form";
import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function EditSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sectionRow = await db.query.section.findFirst({
    where: eq(section.id, id),
  });
  if (sectionRow === undefined) {
    notFound();
  }

  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  if (permissions === null || !can(permissions, "sections", "write")) {
    return (
      <p className="text-muted-foreground">
        Brak uprawnień do edycji tej sekcji.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold break-words">
        Edytuj: {sectionRow.name}
      </h1>
      <SectionForm
        mode="edit"
        sectionId={id}
        defaultValues={{
          name: sectionRow.name,
          description: sectionRow.description ?? "",
        }}
      />
    </div>
  );
}
