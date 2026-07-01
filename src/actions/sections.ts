"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";
import { sectionFormSchema } from "@/lib/schemas/sections";
import type { SectionFormValues } from "@/lib/schemas/sections";

export async function createSection(input: SectionFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "sections", "write")) {
    throw new Error("Tylko zarząd może tworzyć sekcje.");
  }

  const values = sectionFormSchema.parse(input);

  await db.insert(section).values({
    name: values.name,
    description:
      values.description === undefined || values.description === ""
        ? null
        : values.description,
  });

  revalidatePath("/sections");
}

export async function updateSection(
  sectionId: string,
  input: SectionFormValues,
) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "sections", "write")) {
    throw new Error("Tylko zarząd może edytować sekcje.");
  }

  const values = sectionFormSchema.parse(input);

  await db
    .update(section)
    .set({
      name: values.name,
      description:
        values.description === undefined || values.description === ""
          ? null
          : values.description,
    })
    .where(eq(section.id, sectionId));

  revalidatePath("/sections");
  revalidatePath(`/sections/${sectionId}`);
  redirect(`/sections/${sectionId}`);
}

export async function deleteSection(sectionId: string) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "sections", "write")) {
    throw new Error("Tylko zarząd może usuwać sekcje.");
  }

  await db.delete(section).where(eq(section.id, sectionId));

  revalidatePath("/sections");
  redirect("/sections");
}
