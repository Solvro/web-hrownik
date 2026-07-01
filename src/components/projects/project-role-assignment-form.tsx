"use client";

import { useState } from "react";

import { assignProjectRole } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProjectRoleAssignmentForm({
  projectId,
  roleName,
  members,
}: {
  projectId: string;
  roleName: "PM" | "PO";
  members: { id: string; fullName: string }[];
}) {
  const [memberId, setMemberId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (memberId === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await assignProjectRole(projectId, memberId, roleName);
      setMemberId("");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={`Przypisz ${roleName}`} />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={pending || memberId === ""}
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
