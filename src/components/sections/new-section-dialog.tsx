"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import { SectionForm } from "./section-form";

export function NewSectionDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Dodaj sekcję
        </Button>
      </DialogTrigger>
      <SectionForm
        onCreated={() => {
          setOpen(false);
        }}
      />
    </Dialog>
  );
}
