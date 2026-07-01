"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";
import { sectionFormSchema } from "@/lib/schemas/sections";
import type { SectionFormValues } from "@/lib/schemas/sections";

export async function createSection(input: SectionFormValues) {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!canManageMembers(permissions)) {
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
