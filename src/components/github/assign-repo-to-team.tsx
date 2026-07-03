"use client";

import { useState } from "react";

import { assignRepoToTeam } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssignRepoToTeam({
  repoId,
  teams,
}: {
  repoId: string;
  repoFullName: string;
  projectId: string;
  projectName: string;
  teams: { id: string; name: string }[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams[0]?.id ?? "",
  );
  const [pending, setPending] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (selectedTeamId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await assignRepoToTeam(repoId, selectedTeamId);
      setAssigned(true);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  if (assigned) {
    return <span className="text-xs text-green-600">Przypisano</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
        <SelectTrigger className="h-8 w-44">
          <SelectValue placeholder="Wybierz zespół" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={pending || selectedTeamId === ""}
        onClick={() => void handleAssign()}
      >
        Przypisz
      </Button>
      {error === null ? null : (
        <span className="text-destructive text-xs">{error}</span>
      )}
    </div>
  );
}
