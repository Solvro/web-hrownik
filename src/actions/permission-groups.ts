"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  permissionGrant,
  permissionGroup,
  roleDefinitionPermissionGroup,
} from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";
import { isValidGrant } from "@/lib/permissions/catalog";
import type {
  PermissionGrantInput,
  PermissionGroupFormValues,
} from "@/lib/schemas/permission-groups";
import {
  permissionGrantInputSchema,
  permissionGroupFormSchema,
} from "@/lib/schemas/permission-groups";

async function assertCanManageRoles() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "roles", "write")) {
    throw new Error("Tylko zarząd może zarządzać uprawnieniami.");
  }
}

export async function createPermissionGroup(input: PermissionGroupFormValues) {
  await assertCanManageRoles();
  const values = permissionGroupFormSchema.parse(input);

  await db.insert(permissionGroup).values({
    name: values.name,
    description:
      values.description === undefined || values.description === ""
        ? null
        : values.description,
  });

  revalidatePath("/settings/roles");
}

export async function updatePermissionGroup(
  permissionGroupId: string,
  input: PermissionGroupFormValues,
) {
  await assertCanManageRoles();
  const values = permissionGroupFormSchema.parse(input);

  await db
    .update(permissionGroup)
    .set({
      name: values.name,
      description:
        values.description === undefined || values.description === ""
          ? null
          : values.description,
    })
    .where(eq(permissionGroup.id, permissionGroupId));

  revalidatePath("/settings/roles");
}

export async function deletePermissionGroup(permissionGroupId: string) {
  await assertCanManageRoles();

  const linkedRoles = await db
    .select({ id: roleDefinitionPermissionGroup.id })
    .from(roleDefinitionPermissionGroup)
    .where(
      eq(roleDefinitionPermissionGroup.permissionGroupId, permissionGroupId),
    )
    .limit(1);
  if (linkedRoles.length > 0) {
    throw new Error(
      "Nie można usunąć grupy, do której są jeszcze podpięte role.",
    );
  }

  await db
    .delete(permissionGrant)
    .where(eq(permissionGrant.permissionGroupId, permissionGroupId));
  await db
    .delete(permissionGroup)
    .where(eq(permissionGroup.id, permissionGroupId));

  revalidatePath("/settings/roles");
}

/** Backing action for every checkbox in the permission matrix. */
export async function setPermissionGrant(input: PermissionGrantInput) {
  await assertCanManageRoles();
  const values = permissionGrantInputSchema.parse(input);

  if (!isValidGrant(values.resource, values.action)) {
    throw new Error("Nieznane uprawnienie.");
  }

  await (values.enabled
    ? db
        .insert(permissionGrant)
        .values({
          permissionGroupId: values.permissionGroupId,
          resource: values.resource,
          action: values.action,
        })
        .onConflictDoNothing()
    : db
        .delete(permissionGrant)
        .where(
          and(
            eq(permissionGrant.permissionGroupId, values.permissionGroupId),
            eq(permissionGrant.resource, values.resource),
            eq(permissionGrant.action, values.action),
          ),
        ));

  revalidatePath("/settings/roles");
}
