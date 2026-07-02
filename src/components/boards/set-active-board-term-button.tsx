"use client";

import { useState } from "react";

import { setActiveBoardTerm } from "@/actions/boards";
import { Button } from "@/components/ui/button";

export function SetActiveBoardTermButton({
  boardTermId,
}: {
  boardTermId: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      await setActiveBoardTerm(boardTermId);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : "Coś poszło nie tak.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void handleClick()}
      >
        Ustaw jako aktywny
      </Button>
      {error === null ? null : (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </div>
  );
}
