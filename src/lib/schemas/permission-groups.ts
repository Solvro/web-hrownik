import * as z from "zod";

import { PERMISSION_RESOURCES } from "@/lib/permissions/catalog";

const resourceKeys = PERMISSION_RESOURCES.map((resource) => resource.key) as [
  string,
  ...string[],
];

export const permissionGroupFormSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę grupy").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PermissionGroupFormValues = z.infer<
  typeof permissionGroupFormSchema
>;

export const permissionGrantInputSchema = z.object({
  permissionGroupId: z.string().trim().min(1),
  resource: z.enum(resourceKeys),
  action: z.string().trim().min(1),
  enabled: z.boolean(),
});

export type PermissionGrantInput = z.infer<typeof permissionGrantInputSchema>;
