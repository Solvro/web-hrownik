"use client";

import { useState } from "react";

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
}: {
  teamId: string;
  teamName: string;
  members: TeamMemberRow[];
  availableMembers: { id: string; fullName: string }[];
  repositories: { id: string; name: string }[];
  selectedRepositoryIds: string[];
  canManage: boolean;
  roleDefinitions: { id: string; name: string }[];
}) {
  const [name, setName] = useState(teamName);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roleDefinitions[0]?.id ?? "",
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleMemberDetailsChange(
    memberRow: TeamMemberRow,
    values: Partial<{
      roleDefinitionId: string;
      joinedAt: string;
      leftAt: string;
    }>,
  ) {
    setPending(true);
    setError(null);
    try {
      await updateTeamMemberDetails(memberRow.teamMemberId, {
        roleDefinitionId: values.roleDefinitionId ?? memberRow.roleDefinitionId,
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
                      void handleMemberDetailsChange(memberRow, {
                        roleDefinitionId,
                      })
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
                  <Input
                    type="date"
                    defaultValue={toDateInput(memberRow.joinedAt)}
                    aria-label={`Data dołączenia: ${memberRow.fullName}`}
                    className="w-40"
                    onBlur={(event) =>
                      void handleMemberDetailsChange(memberRow, {
                        joinedAt: event.target.value,
                      })
                    }
                  />
                  <Input
                    type="date"
                    defaultValue={toDateInput(memberRow.leftAt)}
                    aria-label={`Data zakończenia: ${memberRow.fullName}`}
                    className="w-40"
                    onBlur={(event) =>
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
              <Combobox
                options={availableMembers.map((option) => ({
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
