"use client";

import { useState } from "react";

import {
  addTeamMember,
  removeTeamMember,
  updateTeamMemberDetails,
  updateTeamRepositories,
} from "@/actions/projects";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
}

const projectRoleOptions = [
  "PM",
  "PO",
  "techlead",
  "TS",
  "programista",
  "UI/UX designer",
  "członek zespołu",
] as const;

function toDateInput(date: Date | null): string {
  return date?.toISOString().slice(0, 10) ?? "";
}

export function TeamPanel({
  teamId,
  members,
  availableMembers,
  repositories,
  selectedRepositoryIds,
  canManage,
}: {
  teamId: string;
  members: TeamMemberRow[];
  availableMembers: { id: string; fullName: string }[];
  repositories: { id: string; name: string }[];
  selectedRepositoryIds: string[];
  canManage: boolean;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("członek zespołu");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (selectedMemberId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addTeamMember(teamId, selectedMemberId, selectedRole);
      setSelectedMemberId("");
      setSelectedRole("członek zespołu");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  async function handleRepositoryChange(nextRepositoryIds: string[]) {
    setPending(true);
    setError(null);
    try {
      await updateTeamRepositories(teamId, nextRepositoryIds);
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

  async function handleMemberDetailsChange(
    memberRow: TeamMemberRow,
    values: Partial<{ role: string; joinedAt: string; leftAt: string }>,
  ) {
    setPending(true);
    setError(null);
    try {
      await updateTeamMemberDetails(memberRow.teamMemberId, {
        role: values.role ?? memberRow.role,
        joinedAt: values.joinedAt ?? toDateInput(memberRow.joinedAt),
        leftAt: values.leftAt ?? toDateInput(memberRow.leftAt),
      });
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
            <div>
              <span>{memberRow.fullName}</span>
              <span className="text-muted-foreground ml-2">
                {memberRow.joinedAt.toLocaleDateString("pl-PL")} –{" "}
                {memberRow.leftAt?.toLocaleDateString("pl-PL") ?? "obecnie"}
              </span>
            </div>
            {canManage ? (
              <div className="flex items-center gap-2">
                <Select
                  value={memberRow.role}
                  onValueChange={(role) =>
                    void handleMemberDetailsChange(memberRow, { role })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectRoleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={toDateInput(memberRow.joinedAt)}
                  aria-label={`Data dołączenia: ${memberRow.fullName}`}
                  className="w-40"
                  onChange={(event) =>
                    void handleMemberDetailsChange(memberRow, {
                      joinedAt: event.target.value,
                    })
                  }
                />
                <Input
                  type="date"
                  value={toDateInput(memberRow.leftAt)}
                  aria-label={`Data zakończenia: ${memberRow.fullName}`}
                  className="w-40"
                  onChange={(event) =>
                    void handleMemberDetailsChange(memberRow, {
                      leftAt: event.target.value,
                    })
                  }
                />
                {memberRow.leftAt === null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void handleRemove(memberRow.teamMemberId)}
                  >
                    Zakończ
                  </Button>
                ) : null}
              </div>
            ) : (
              <span className="text-muted-foreground">{memberRow.role}</span>
            )}
          </li>
        ))}
        {members.length === 0 ? (
          <li className="text-muted-foreground p-2 text-sm">Brak członków</li>
        ) : null}
      </ul>
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Repozytoria zespołu</p>
        {canManage ? (
          <MultiSelect
            options={repositories.map((repo) => ({
              value: repo.id,
              label: repo.name,
            }))}
            value={selectedRepositoryIds}
            onChange={(value) => void handleRepositoryChange(value)}
            placeholder="Wybierz repozytoria"
          />
        ) : selectedRepositoryIds.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Brak przypisanych repozytoriów
          </p>
        ) : (
          <div className="text-sm">
            {repositories
              .filter((repo) => selectedRepositoryIds.includes(repo.id))
              .map((repo) => repo.name)
              .join(", ")}
          </div>
        )}
      </div>
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
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Rola" />
            </SelectTrigger>
            <SelectContent>
              {projectRoleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
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
