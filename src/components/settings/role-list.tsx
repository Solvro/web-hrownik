"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { deleteRoleDefinition } from "@/actions/roles";
import { DeleteButton } from "@/components/delete-button";
import type { RoleDefinitionData } from "@/components/settings/role-form";
import { RoleForm } from "@/components/settings/role-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

const scopeLabels = {
  board: "Zarząd",
  section: "Sekcja",
  project: "Projekt",
} as const;

export function RoleList({
  roles,
  permissionGroups,
}: {
  roles: RoleDefinitionData[];
  permissionGroups: { id: string; name: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const groupNameById = new Map(
    permissionGroups.map((group) => [group.id, group.name]),
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Dodaj rolę
            </Button>
          </DialogTrigger>
          <RoleForm
            permissionGroups={permissionGroups}
            onSaved={() => {
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>
      <ul className="divide-y rounded-md border">
        {roles.map((role) => (
          <li
            key={role.id}
            className="flex items-center justify-between gap-2 p-3 text-sm"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                <Badge variant="outline">{scopeLabels[role.scope]}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissionGroupIds.length === 0 ? (
                  <span className="text-muted-foreground text-xs">
                    Bez grup uprawnień
                  </span>
                ) : (
                  role.permissionGroupIds.map((groupId) => (
                    <Badge key={groupId} variant="secondary">
                      {groupNameById.get(groupId) ?? groupId}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Dialog
                open={editingRoleId === role.id}
                onOpenChange={(open) => {
                  setEditingRoleId(open ? role.id : null);
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Pencil />
                    Edytuj
                  </Button>
                </DialogTrigger>
                <RoleForm
                  role={role}
                  permissionGroups={permissionGroups}
                  onSaved={() => {
                    setEditingRoleId(null);
                  }}
                />
              </Dialog>
              <DeleteButton
                action={deleteRoleDefinition.bind(null, role.id)}
                confirmMessage={`Na pewno usunąć rolę "${role.name}"?`}
              >
                Usuń
              </DeleteButton>
            </div>
          </li>
        ))}
        {roles.length === 0 ? (
          <li className="text-muted-foreground p-3 text-sm">Brak ról</li>
        ) : null}
      </ul>
    </div>
  );
}
