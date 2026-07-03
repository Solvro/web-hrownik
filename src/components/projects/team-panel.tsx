"use client";

import { useCallback, useRef, useState } from "react";

import {
  addTeamMember,
  deleteTeam,
  removeTeamMember,
  updateTeamMemberDetails,
  updateTeamName,
  updateTeamRepositories,
} from "@/actions/projects";
import { DeleteButton } from "@/components/delete-button";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  roleDefinitionId: string;
  roleDefinitionName: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface AvailableMember {
  id: string;
  fullName: string;
  status: string;
  hasProjectContributions: boolean;
  hasTeamContributions: boolean;
}

function toDateInput(date: Date | null): string {
  return date?.toISOString().slice(0, 10) ?? "";
}

export function TeamPanel({
  teamId,
  teamName,
  members,
  availableMembers,
  repositories,
  selectedRepositoryIds,
  canManage,
  roleDefinitions,
  projectStartedAt,
  projectEndedAt,
  firstCommitDate,
}: {
  teamId: string;
  teamName: string;
  members: TeamMemberRow[];
  availableMembers: AvailableMember[];
  repositories: { id: string; name: string }[];
  selectedRepositoryIds: string[];
  canManage: boolean;
  roleDefinitions: { id: string; name: string }[];
  projectStartedAt?: string;
  projectEndedAt?: string;
  firstCommitDate?: string;
}) {
  const [name, setName] = useState(teamName);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roleDefinitions[0]?.id ?? "",
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterActiveOnly, setFilterActiveOnly] = useState(true);
  const [filterProjectContributions, setFilterProjectContributions] =
    useState(false);
  const [filterTeamContributions, setFilterTeamContributions] = useState(true);

  const debounceTimers = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});

  const debouncedSave = useCallback(
    (
      teamMemberId: string,
      roleDefinitionId: string,
      joinedAt: string,
      leftAt: string,
      delayMs = 600,
    ) => {
      const existing = debounceTimers.current[teamMemberId];
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      debounceTimers.current[teamMemberId] = setTimeout(() => {
        void updateTeamMemberDetails(teamMemberId, {
          roleDefinitionId,
          joinedAt,
          leftAt,
        });
        debounceTimers.current[teamMemberId] = undefined;
      }, delayMs);
    },
    [],
  );

  async function handleAdd() {
    if (selectedMemberId === "" || selectedRoleId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addTeamMember(teamId, selectedMemberId, selectedRoleId);
      setSelectedMemberId("");
      setSelectedRoleId(roleDefinitions[0]?.id ?? "");
      setAddDialogOpen(false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  async function handleRename() {
    if (name.trim() === "" || name.trim() === teamName) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await updateTeamName(teamId, name);
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

  async function handleRoleChange(
    memberRow: TeamMemberRow,
    roleDefinitionId: string,
  ) {
    setPending(true);
    setError(null);
    try {
      await updateTeamMemberDetails(memberRow.teamMemberId, {
        roleDefinitionId,
        joinedAt: toDateInput(memberRow.joinedAt),
        leftAt: toDateInput(memberRow.leftAt),
      });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  const filteredMembers = availableMembers.filter((member) => {
    if (filterActiveOnly && member.status !== "active") {
      return false;
    }
    if (filterProjectContributions && !member.hasProjectContributions) {
      return false;
    }
    if (filterTeamContributions && !member.hasTeamContributions) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-2">
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            onBlur={() => void handleRename()}
            className="w-56"
            aria-label="Nazwa zespołu"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || name.trim() === "" || name.trim() === teamName}
            onClick={() => void handleRename()}
          >
            Zmień nazwę
          </Button>
          {members.length === 0 && selectedRepositoryIds.length === 0 ? (
            <DeleteButton
              action={deleteTeam.bind(null, teamId)}
              confirmMessage={`Na pewno usunąć zespół "${teamName}"?`}
            >
              Usuń zespół
            </DeleteButton>
          ) : null}
        </div>
      ) : null}
      <ul className="divide-y rounded-md border">
        {members
          .toSorted(
            (first, second) =>
              first.joinedAt.getTime() - second.joinedAt.getTime(),
          )
          .map((memberRow) => (
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
                    value={memberRow.roleDefinitionId}
                    onValueChange={(roleDefinitionId) =>
                      void handleRoleChange(memberRow, roleDefinitionId)
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleDefinitions.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      defaultValue={toDateInput(memberRow.joinedAt)}
                      min={projectStartedAt}
                      max={projectEndedAt}
                      aria-label={`Data dołączenia: ${memberRow.fullName}`}
                      className="w-40"
                      onChange={(event) => {
                        debouncedSave(
                          memberRow.teamMemberId,
                          memberRow.roleDefinitionId,
                          event.target.value,
                          toDateInput(memberRow.leftAt),
                        );
                      }}
                    />
                    {firstCommitDate === undefined ? null : (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] underline underline-offset-2"
                        title={`Pierwszy commit: ${firstCommitDate}`}
                        onClick={() => {
                          const input =
                            document.querySelector<HTMLInputElement>(
                              `[aria-label="Data dołączenia: ${memberRow.fullName}"]`,
                            );
                          if (input !== null) {
                            input.value = firstCommitDate;
                            input.dispatchEvent(
                              new Event("change", { bubbles: true }),
                            );
                          }
                        }}
                      >
                        {firstCommitDate}
                      </button>
                    )}
                  </div>
                  <Input
                    type="date"
                    defaultValue={toDateInput(memberRow.leftAt)}
                    min={projectStartedAt}
                    max={projectEndedAt}
                    aria-label={`Data zakończenia: ${memberRow.fullName}`}
                    className="w-40"
                    onChange={(event) => {
                      debouncedSave(
                        memberRow.teamMemberId,
                        memberRow.roleDefinitionId,
                        toDateInput(memberRow.joinedAt),
                        event.target.value,
                      );
                    }}
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
                <span className="text-muted-foreground">
                  {memberRow.roleDefinitionName}
                </span>
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
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm">
              Dodaj do zespołu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj do zespołu</DialogTitle>
              <DialogDescription>
                Wybierz członka i jedną ze zdefiniowanych ról projektowych.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={filterActiveOnly}
                    onChange={(event) => {
                      setFilterActiveOnly(event.target.checked);
                    }}
                  />
                  Tylko aktywni
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={filterProjectContributions}
                    onChange={(event) => {
                      setFilterProjectContributions(event.target.checked);
                    }}
                  />
                  Z kontrybucjami w projekcie
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={filterTeamContributions}
                    onChange={(event) => {
                      setFilterTeamContributions(event.target.checked);
                    }}
                  />
                  Z kontrybucjami w zespole
                </label>
              </div>
              <Combobox
                options={filteredMembers.map((option) => ({
                  value: option.id,
                  label: option.fullName,
                }))}
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
                placeholder="Wybierz członka"
              />
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rola" />
                </SelectTrigger>
                <SelectContent>
                  {roleDefinitions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={
                  pending || selectedMemberId === "" || selectedRoleId === ""
                }
                onClick={() => void handleAdd()}
              >
                Dodaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {error === null ? null : (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
