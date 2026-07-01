"use client";

import type { PermissionGroupData } from "@/components/settings/permission-matrix";
import { PermissionMatrix } from "@/components/settings/permission-matrix";
import type { RoleDefinitionData } from "@/components/settings/role-form";
import { RoleList } from "@/components/settings/role-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RolesPermissionsTabs({
  roleDefinitions,
  permissionGroups,
}: {
  roleDefinitions: RoleDefinitionData[];
  permissionGroups: PermissionGroupData[];
}) {
  const permissionGroupOptions = permissionGroups.map((group) => ({
    id: group.id,
    name: group.name,
  }));

  return (
    <Tabs defaultValue="roles">
      <TabsList>
        <TabsTrigger value="roles">Role</TabsTrigger>
        <TabsTrigger value="permission-groups">Grupy uprawnień</TabsTrigger>
      </TabsList>
      <TabsContent value="roles">
        <RoleList
          roles={roleDefinitions}
          permissionGroups={permissionGroupOptions}
        />
      </TabsContent>
      <TabsContent value="permission-groups">
        <PermissionMatrix permissionGroups={permissionGroups} />
      </TabsContent>
    </Tabs>
  );
}
