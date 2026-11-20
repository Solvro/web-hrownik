"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RecruitmentUploadValues } from "@/lib/schemas/member-import";
import { recruitmentUploadSchema } from "@/lib/schemas/member-import";

export type RecruitmentUpload = RecruitmentUploadValues;

export function ImportUploadStep({
  defaultValues,
  onUpload,
}: {
  defaultValues: { edition: string; joinedAt: string };
  onUpload: (upload: RecruitmentUpload) => Promise<string | null>;
}) {
  const form = useForm<
    z.input<typeof recruitmentUploadSchema>,
    unknown,
    RecruitmentUploadValues
  >({
    resolver: zodResolver(recruitmentUploadSchema),
    defaultValues,
  });

  async function onSubmit(values: RecruitmentUploadValues) {
    try {
      const error = await onUpload(values);
      if (error !== null) {
        form.setError("root", { message: error });
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Coś poszło nie tak.",
      });
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
          name="file"
          control={form.control}
          render={({ field: { onChange, name }, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={name}>Eksport uczestników</FieldLabel>
              <input
                id={name}
                name={name}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                aria-invalid={fieldState.invalid}
                onChange={(event) => {
                  onChange(event.target.files?.[0]);
                }}
                className="border-input file:text-foreground rounded-md border px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <FieldDescription>
                Plik .xlsx wyeksportowany z wydarzenia rekrutacyjnego w
                Eventowniku (albo .csv z tymi samymi kolumnami), maks. 5 MB. Nic
                nie zostanie zapisane przed ostatnim krokiem.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="edition"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Edycja rekrutacji</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="np. Rekrutacja 2026Z"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Zapisywana przy każdej zaimportowanej osobie, żeby było wiadomo,
                z której rekrutacji przyszła.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="joinedAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Data dołączenia</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="date"
                className="w-fit"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Od tego dnia liczy się członkostwo w sekcjach.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {form.formState.errors.root === undefined ? null : (
          <FieldError errors={[form.formState.errors.root]} />
        )}

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Wczytuję…" : "Wczytaj plik"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
