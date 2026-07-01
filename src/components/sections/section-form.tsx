"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createSection } from "@/actions/sections";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SectionFormValues } from "@/lib/schemas/sections";
import { sectionFormSchema } from "@/lib/schemas/sections";

export function SectionForm({ onCreated }: { onCreated: () => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(values: SectionFormValues) {
    setSubmitError(null);
    try {
      await createSection(values);
      form.reset();
      onCreated();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nowa sekcja</DialogTitle>
        <DialogDescription>
          Sekcje grupują członków (np. dział graficzny, dział webowy).
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nazwa</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Opis</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          {submitError === null ? null : (
            <FieldDescription className="text-destructive">
              {submitError}
            </FieldDescription>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anuluj
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Utwórz
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </DialogContent>
  );
}
