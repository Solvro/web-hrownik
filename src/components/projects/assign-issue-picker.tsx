"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssignIssuePicker({
  repoFullName,
  members,
}: {
  repoFullName: string;
  members: { id: string; fullName: string; githubUsername: string }[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const selectedMember = members.find((option) => option.id === selectedId);
  const href =
    selectedMember === undefined
      ? undefined
      : `https://github.com/${repoFullName}/issues/new?assignees=${encodeURIComponent(selectedMember.githubUsername)}`;

  return (
    <div className="flex gap-2">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Wybierz członka" />
        </SelectTrigger>
        <SelectContent>
          {members.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {href === undefined ? (
        <Button disabled>Nowy issue z assignee</Button>
      ) : (
        <Button asChild>
          <a href={href} target="_blank" rel="noreferrer">
            Nowy issue z assignee
          </a>
        </Button>
      )}
    </div>
  );
}
