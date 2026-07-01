"use client";

import { useState } from "react";

import { assignRole, endRoleAssignment } from "@/actions/roles";
import { Button } from "@/components/ui/button";
import type { RoleAssignmentDraft } from "@/lib/schemas/roles";

import type { RoleDefinitionOption } from "./role-picker-fields";
import { RolePickerFields } from "./role-picker-fields";

interface ActiveRole {
  id: string;
  roleDefinitionName: string;
  targetLabel: string | null;
}

export function RoleManager({
  memberId,
  activeRoles,
  roleDefinitions,
  sections,
  projects,
}: {
  memberId: string;
  activeRoles: ActiveRole[];
  roleDefinitions: RoleDefinitionOption[];
  sections: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<RoleAssignmentDraft>({
    roleDefinitionId: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (draft.roleDefinitionId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await assignRole(memberId, draft);
      setDraft({ roleDefinitionId: "" });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  async function handleEnd(roleAssignmentId: string) {
    setPending(true);
    setError(null);
    try {
      await endRoleAssignment(roleAssignmentId);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {activeRoles.map((role) => (
          <li
            key={role.id}
            className="flex items-center justify-between p-2 text-sm"
          >
            <span>
              {role.roleDefinitionName}
              {role.targetLabel === null ? "" : ` — ${role.targetLabel}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => void handleEnd(role.id)}
            >
              Zakończ
            </Button>
          </li>
        ))}
        {activeRoles.length === 0 ? (
          <li className="text-muted-foreground p-2 text-sm">
            Brak aktywnych ról
          </li>
        ) : null}
      </ul>
      <div className="flex gap-2">
        <RolePickerFields
          roleDefinitions={roleDefinitions}
          sections={sections}
          projects={projects}
          value={draft}
          onChange={setDraft}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || draft.roleDefinitionId === ""}
          onClick={() => void handleAssign()}
        >
          Dodaj
        </Button>
      </div>
      {error === null ? null : (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
