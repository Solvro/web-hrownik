/**
 * Single source of truth for what can be granted at all. Resources/actions
 * mirror the actual enforcement points in src/actions/* — adding a new gate
 * means adding an entry here; who gets it stays entirely in the database.
 */
export const PERMISSION_RESOURCES = [
  { key: "members", label: "Członkowie", actions: ["read", "write"] },
  { key: "boards", label: "Kadencje", actions: ["read", "write"] },
  { key: "sections", label: "Sekcje", actions: ["read", "write"] },
  { key: "projects", label: "Projekty", actions: ["read", "write"] },
  { key: "roles", label: "Role i uprawnienia", actions: ["read", "write"] },
  {
    key: "project_team",
    label: "Zespoły projektowe (lider)",
    actions: ["lead"],
  },
] as const;

export type PermissionResourceKey =
  (typeof PERMISSION_RESOURCES)[number]["key"];

const actionLabels: Record<string, string> = {
  read: "odczyt",
  write: "zarządzanie",
  lead: "lider",
};

export interface PermissionMatrixColumn {
  resource: PermissionResourceKey;
  action: string;
  resourceLabel: string;
  actionLabel: string;
}

export const PERMISSION_MATRIX_COLUMNS: PermissionMatrixColumn[] =
  PERMISSION_RESOURCES.flatMap((resource) =>
    resource.actions.map((action) => ({
      resource: resource.key,
      action,
      resourceLabel: resource.label,
      actionLabel: actionLabels[action] ?? action,
    })),
  );

export function grantKey(
  resource: string,
  action: string,
): `${string}:${string}` {
  return `${resource}:${action}`;
}

export function isValidGrant(resource: string, action: string): boolean {
  const resourceEntry = PERMISSION_RESOURCES.find((r) => r.key === resource);
  return (
    resourceEntry !== undefined &&
    (resourceEntry.actions as readonly string[]).includes(action)
  );
}
