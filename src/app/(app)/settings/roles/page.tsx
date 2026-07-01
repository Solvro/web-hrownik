import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { RolesPermissionsTabs } from "@/components/settings/roles-permissions-tabs";
import { db } from "@/db";
import { permissionGroup, roleDefinition } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function RolesSettingsPage() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    redirect("/login");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "roles", "write")) {
    redirect("/");
  }

  const [roleDefinitions, permissionGroups] = await Promise.all([
    db.query.roleDefinition.findMany({
      orderBy: asc(roleDefinition.name),
      with: { permissionGroupLinks: true },
    }),
    db.query.permissionGroup.findMany({
      orderBy: asc(permissionGroup.name),
      with: { grants: true },
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Role i uprawnienia</h1>
        <p className="text-muted-foreground text-sm">
          Role to same nazwy — o tym, co dana rola pozwala robić, decydują grupy
          uprawnień, do których należą.
        </p>
      </div>
      <RolesPermissionsTabs
        roleDefinitions={roleDefinitions.map((role) => ({
          id: role.id,
          scope: role.scope,
          name: role.name,
          githubTeamSlug: role.githubTeamSlug,
          discordRoleId: role.discordRoleId,
          permissionGroupIds: role.permissionGroupLinks.map(
            (link) => link.permissionGroupId,
          ),
        }))}
        permissionGroups={permissionGroups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          grants: group.grants.map((grant) => ({
            resource: grant.resource,
            action: grant.action,
          })),
        }))}
      />
    </div>
  );
}
