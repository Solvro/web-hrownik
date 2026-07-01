"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createSection, updateSection } from "@/actions/sections";
import { Button } from "@/components/ui/button";
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

export function SectionForm({
  mode,
  sectionId,
  onCreated,
  defaultValues,
}: {
  mode: "create" | "edit";
  sectionId?: string;
  onCreated?: () => void;
  defaultValues?: SectionFormValues;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: defaultValues ?? { name: "", description: "" },
  });

  async function onSubmit(values: SectionFormValues) {
    setSubmitError(null);
    try {
      if (mode === "create") {
        await createSection(values);
        form.reset();
        onCreated?.();
      } else if (sectionId !== undefined) {
        await updateSection(sectionId, values);
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      noValidate
      className="max-w-2xl"
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
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save />
            {mode === "create" ? "Utwórz sekcję" : "Zapisz"}
          </Button>
          {mode === "edit" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.back();
              }}
            >
              Anuluj
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
