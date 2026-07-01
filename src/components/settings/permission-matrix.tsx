"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import {
  deletePermissionGroup,
  setPermissionGrant,
} from "@/actions/permission-groups";
import { DeleteButton } from "@/components/delete-button";
import { PermissionGroupForm } from "@/components/settings/permission-group-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PERMISSION_MATRIX_COLUMNS, grantKey } from "@/lib/permissions/catalog";

export interface PermissionGroupData {
  id: string;
  name: string;
  description: string | null;
  grants: { resource: string; action: string }[];
}

export function PermissionMatrix({
  permissionGroups,
}: {
  permissionGroups: PermissionGroupData[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Optimistic overlay on top of server-provided grants, keyed by
  // `${permissionGroupId}:${resource}:${action}`; cleared once the server
  // state (revalidated via the action's revalidatePath) catches up.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  function isGranted(groupId: string, resource: string, action: string) {
    const key = `${groupId}:${grantKey(resource, action)}`;
    const override = overrides.get(key);
    if (override !== undefined) {
      return override;
    }
    const group = permissionGroups.find(
      (candidate) => candidate.id === groupId,
    );
    return (
      group?.grants.some(
        (grant) => grant.resource === resource && grant.action === action,
      ) ?? false
    );
  }

  async function toggle(groupId: string, resource: string, action: string) {
    const key = `${groupId}:${grantKey(resource, action)}`;
    const nextValue = !isGranted(groupId, resource, action);
    setError(null);
    setPendingKey(key);
    setOverrides((previous) => new Map(previous).set(key, nextValue));
    try {
      await setPermissionGrant({
        permissionGroupId: groupId,
        resource,
        action,
        enabled: nextValue,
      });
    } catch (error_) {
      setOverrides((previous) => new Map(previous).set(key, !nextValue));
      setError(
        error_ instanceof Error ? error_.message : "Coś poszło nie tak.",
      );
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Wiersze to grupy uprawnień, kolumny — konkretne zdolności zdefiniowane
          w kodzie.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Dodaj grupę
            </Button>
          </DialogTrigger>
          <PermissionGroupForm
            onSaved={() => {
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium">Grupa</th>
              {PERMISSION_MATRIX_COLUMNS.map((column) => (
                <th
                  key={grantKey(column.resource, column.action)}
                  className="p-2 text-center font-medium whitespace-nowrap"
                >
                  {column.resourceLabel}
                  <br />
                  <span className="text-muted-foreground font-normal">
                    {column.actionLabel}
                  </span>
                </th>
              ))}
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <tr key={group.id} className="border-b last:border-0">
                <td className="p-2 align-top">
                  <div className="font-medium">{group.name}</div>
                  {group.description === null ||
                  group.description === "" ? null : (
                    <div className="text-muted-foreground text-xs">
                      {group.description}
                    </div>
                  )}
                </td>
                {PERMISSION_MATRIX_COLUMNS.map((column) => {
                  const key = `${group.id}:${grantKey(column.resource, column.action)}`;
                  return (
                    <td key={key} className="p-2 text-center align-middle">
                      <Checkbox
                        checked={isGranted(
                          group.id,
                          column.resource,
                          column.action,
                        )}
                        disabled={pendingKey === key}
                        onCheckedChange={() =>
                          void toggle(group.id, column.resource, column.action)
                        }
                        aria-label={`${group.name}: ${column.resourceLabel} · ${column.actionLabel}`}
                      />
                    </td>
                  );
                })}
                <td className="p-2 align-top">
                  <div className="flex items-center gap-2">
                    <Dialog
                      open={editingGroupId === group.id}
                      onOpenChange={(open) => {
                        setEditingGroupId(open ? group.id : null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Pencil />
                        </Button>
                      </DialogTrigger>
                      <PermissionGroupForm
                        group={group}
                        onSaved={() => {
                          setEditingGroupId(null);
                        }}
                      />
                    </Dialog>
                    <DeleteButton
                      action={deletePermissionGroup.bind(null, group.id)}
                      confirmMessage={`Na pewno usunąć grupę "${group.name}"?`}
                    >
                      Usuń
                    </DeleteButton>
                  </div>
                </td>
              </tr>
            ))}
            {permissionGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={PERMISSION_MATRIX_COLUMNS.length + 2}
                  className="text-muted-foreground p-3 text-center"
                >
                  Brak grup uprawnień
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {error === null ? null : (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
