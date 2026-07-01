"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  createPermissionGroup,
  updatePermissionGroup,
} from "@/actions/permission-groups";
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
import type { PermissionGroupFormValues } from "@/lib/schemas/permission-groups";
import { permissionGroupFormSchema } from "@/lib/schemas/permission-groups";

export function PermissionGroupForm({
  group,
  onSaved,
}: {
  group?: { id: string; name: string; description: string | null };
  onSaved: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PermissionGroupFormValues>({
    resolver: zodResolver(permissionGroupFormSchema),
    defaultValues: {
      name: group?.name ?? "",
      description: group?.description ?? "",
    },
  });

  async function onSubmit(values: PermissionGroupFormValues) {
    setSubmitError(null);
    try {
      await (group === undefined
        ? createPermissionGroup(values)
        : updatePermissionGroup(group.id, values));
      form.reset();
      onSaved();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {group === undefined ? "Nowa grupa uprawnień" : "Edytuj grupę"}
        </DialogTitle>
        <DialogDescription>
          Sama nazwa i opis — konkretne uprawnienia zaznaczysz w macierzy po
          zapisaniu.
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
                <FieldLabel htmlFor={field.name}>Opis (opcjonalnie)</FieldLabel>
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
              Zapisz
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </DialogContent>
  );
}
