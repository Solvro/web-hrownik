"use client";

import { useState } from "react";

import { createTeam } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewTeamForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (name.trim() === "") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createTeam(projectId, name);
      setName("");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Błąd");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="np. frontend"
          className="w-56"
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || name.trim() === ""}
          onClick={() => void handleCreate()}
        >
          Dodaj zespół
        </Button>
      </div>
      {error === null ? null : (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
