"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createRoleDefinition, updateRoleDefinition } from "@/actions/roles";
import { MultiSelect } from "@/components/multi-select";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleDefinitionFormValues } from "@/lib/schemas/roles";
import { roleDefinitionFormSchema } from "@/lib/schemas/roles";

const scopeLabels = {
  board: "Zarząd",
  section: "Sekcja",
  project_team: "Zespół projektu",
  project: "Projekt",
} as const;

export interface RoleDefinitionData {
  id: string;
  scope: "board" | "section" | "project_team" | "project";
  name: string;
  githubTeamSlug: string | null;
  discordRoleId: string | null;
  permissionGroupIds: string[];
}

export function RoleForm({
  role,
  permissionGroups,
  onSaved,
}: {
  role?: RoleDefinitionData;
  permissionGroups: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RoleDefinitionFormValues>({
    resolver: zodResolver(roleDefinitionFormSchema),
    defaultValues: {
      scope: role?.scope ?? "board",
      name: role?.name ?? "",
      githubTeamSlug: role?.githubTeamSlug ?? "",
      discordRoleId: role?.discordRoleId ?? "",
      permissionGroupIds: role?.permissionGroupIds ?? [],
    },
  });

  async function onSubmit(values: RoleDefinitionFormValues) {
    setSubmitError(null);
    try {
      await (role === undefined
        ? createRoleDefinition(values)
        : updateRoleDefinition(role.id, values));
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
          {role === undefined ? "Nowa rola" : "Edytuj rolę"}
        </DialogTitle>
        <DialogDescription>
          Rola to sama nazwa — o tym, co dzięki niej można zrobić, decydują
          grupy uprawnień, do których należy.
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
            name="scope"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Zakres</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(scopeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Zarząd i sekcja przypisywane są członkom bezpośrednio; zespół
                  projektu — w zespołach, a projekt — do całego projektu.
                </FieldDescription>
              </Field>
            )}
          />
          <Controller
            name="permissionGroupIds"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Grupy uprawnień</FieldLabel>
                <MultiSelect
                  options={permissionGroups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Brak grup"
                />
              </Field>
            )}
          />
          <Controller
            name="githubTeamSlug"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Slug zespołu GitHub (opcjonalnie)
                </FieldLabel>
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
            name="discordRoleId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  ID roli Discord (opcjonalnie)
                </FieldLabel>
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
