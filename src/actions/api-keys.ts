"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { apiKey } from "@/db/schema/api-keys";
import {
  generateApiKeySecret,
  getApiKeyDisplayPrefix,
  hashApiKeySecret,
} from "@/lib/api-keys";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";
import type { ApiKeyFormValues } from "@/lib/schemas/api-keys";
import { apiKeyFormSchema } from "@/lib/schemas/api-keys";

async function assertCanManageApiKeys() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "roles", "write")) {
    throw new Error("Tylko zarząd może zarządzać kluczami API.");
  }
  return currentMember;
}

export async function createApiKey(input: ApiKeyFormValues) {
  const currentMember = await assertCanManageApiKeys();
  const values = apiKeyFormSchema.parse(input);

  const secret = generateApiKeySecret();
  const [created] = await db
    .insert(apiKey)
    .values({
      name: values.name,
      keyHash: hashApiKeySecret(secret),
      keyPrefix: getApiKeyDisplayPrefix(secret),
      createdByMemberId: currentMember.id,
    })
    .returning();

  revalidatePath("/settings/roles");

  // The raw secret is only ever available here — it is not stored anywhere.
  return { id: created.id, name: created.name, secret };
}

export async function deleteApiKey(apiKeyId: string) {
  await assertCanManageApiKeys();

  await db.delete(apiKey).where(eq(apiKey.id, apiKeyId));

  revalidatePath("/settings/roles");
}
