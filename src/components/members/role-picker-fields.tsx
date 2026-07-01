"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleAssignmentDraft } from "@/lib/schemas/roles";

export interface RoleDefinitionOption {
  id: string;
  name: string;
  scope: "section" | "project" | "board";
}

const scopeLabels: Record<RoleDefinitionOption["scope"], string> = {
  board: "Zarząd",
  section: "Sekcja",
  project: "Projekt",
};

const scopeOrder = ["board", "section"] as const;

export function RolePickerFields({
  roleDefinitions,
  sections,
  value,
  onChange,
}: {
  roleDefinitions: RoleDefinitionOption[];
  sections: { id: string; name: string }[];
  value: RoleAssignmentDraft;
  onChange: (value: RoleAssignmentDraft) => void;
}) {
  const selectedRole = roleDefinitions.find(
    (role) => role.id === value.roleDefinitionId,
  );

  return (
    <div className="flex flex-1 flex-wrap gap-2">
      <Select
        value={value.roleDefinitionId}
        onValueChange={(roleDefinitionId) => {
          onChange({ roleDefinitionId });
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Wybierz rolę" />
        </SelectTrigger>
        <SelectContent>
          {scopeOrder.map((scope) => {
            const options = roleDefinitions.filter(
              (role) => role.scope === scope,
            );
            return options.length === 0 ? null : (
              <SelectGroup key={scope}>
                <SelectLabel>{scopeLabels[scope]}</SelectLabel>
                {options.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>

      {selectedRole?.scope === "section" ? (
        <Select
          value={value.sectionId ?? ""}
          onValueChange={(sectionId) => {
            onChange({ ...value, sectionId });
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Wybierz sekcję" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Input
        type="date"
        value={value.startedAt ?? ""}
        onChange={(event) => {
          onChange({ ...value, startedAt: event.target.value });
        }}
        aria-label="Data objęcia roli"
        className="w-40"
      />
      <Input
        type="date"
        value={value.endedAt ?? ""}
        onChange={(event) => {
          onChange({ ...value, endedAt: event.target.value });
        }}
        aria-label="Data zakończenia roli"
        className="w-40"
      />
    </div>
  );
}
