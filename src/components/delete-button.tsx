"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteButton({
  action,
  confirmMessage,
  children,
  size,
  ariaLabel,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  size?: React.ComponentProps<typeof Button>["size"];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (error_) {
      // next/navigation's redirect() (called on success) throws an internal
      // control-flow error that must propagate, not be shown as a failure.
      if (
        typeof error_ === "object" &&
        error_ !== null &&
        "digest" in error_ &&
        typeof error_.digest === "string" &&
        error_.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error_;
      }
      setError(
        error_ instanceof Error ? error_.message : "Coś poszło nie tak.",
      );
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size={size}
          aria-label={ariaLabel}
        >
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź usunięcie</DialogTitle>
          <DialogDescription>{confirmMessage}</DialogDescription>
        </DialogHeader>
        {error === null ? null : (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setOpen(false);
            }}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Usuwam…" : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
