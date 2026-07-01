"use client";

import { useState } from "react";

import { addTeamMember, removeTeamMember } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMemberRow {
  teamMemberId: string;
  memberId: string;
  fullName: string;
}

export function TeamPanel({
  teamId,
  members,
  availableMembers,
  canManage,
}: {
  teamId: string;
  members: TeamMemberRow[];
  availableMembers: { id: string; fullName: string }[];
  canManage: boolean;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (selectedMemberId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addTeamMember(teamId, selectedMemberId);
      setSelectedMemberId("");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(teamMemberId: string) {
    setPending(true);
    setError(null);
    try {
      await removeTeamMember(teamMemberId);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {members.map((memberRow) => (
          <li
            key={memberRow.teamMemberId}
            className="flex items-center justify-between p-2 text-sm"
          >
            {memberRow.fullName}
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => void handleRemove(memberRow.teamMemberId)}
              >
                Usuń
              </Button>
            ) : null}
          </li>
        ))}
        {members.length === 0 ? (
          <li className="text-muted-foreground p-2 text-sm">Brak członków</li>
        ) : null}
      </ul>
      {canManage && availableMembers.length > 0 ? (
        <div className="flex gap-2">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Wybierz członka" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={pending || selectedMemberId === ""}
            onClick={() => void handleAdd()}
          >
            Dodaj
          </Button>
        </div>
      ) : null}
      {error === null ? null : (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
