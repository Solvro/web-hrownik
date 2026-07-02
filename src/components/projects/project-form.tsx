"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { createProject, updateProject } from "@/actions/projects";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
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
import { declineNumeric } from "@/lib/polish";
import type { ProjectFormValues } from "@/lib/schemas/projects";
import { projectFormSchema } from "@/lib/schemas/projects";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/[\s-]+/g, "-");
}

export function ProjectForm({
  mode = "create",
  projectId,
  repoOptions,
  memberOptions = [],
  projectRoleDefinitions = [],
  defaultValues,
}: {
  mode?: "create" | "edit";
  projectId?: string;
  repoOptions: { value: string; label: string }[];
  memberOptions?: { id: string; fullName: string }[];
  projectRoleDefinitions?: { id: string; name: string }[];
  defaultValues?: ProjectFormValues;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      slug: "",
      status: "active",
      visibility: "internal",
      productionUrl: "",
      driveFolderUrl: "",
      projectCardDriveUrl: "",
      reportDriveUrl: "",
      repositoryFullNames: [],
      projectRoles: [],
    },
  });
  const projectRoles = useFieldArray({
    control: form.control,
    name: "projectRoles",
  });
  const projectName = form.watch("name");
  const slug = form.watch("slug");
  const suggestedSlug = slugify(projectName);
  const status = form.watch("status");
  const suggestedRepoOptions = repoOptions.filter((repo) =>
    repo.label.toLowerCase().includes(slug.toLowerCase()),
  );
  const suggestedRepoValues = suggestedRepoOptions.map((repo) => repo.value);

  async function onSubmit(values: ProjectFormValues) {
    setSubmitError(null);
    try {
      if (mode === "create") {
        await createProject(values);
      } else if (projectId !== undefined) {
        await updateProject(projectId, values);
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
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
              <div className="flex gap-2">
                <Input
                  {...field}
                  id={field.name}
                  placeholder="nazwa-projektu"
                  aria-invalid={fieldState.invalid}
                />
                {mode === "create" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={suggestedSlug === "" || suggestedSlug === slug}
                    onClick={() => {
                      form.setValue("slug", suggestedSlug, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className="max-w-48 shrink-0 truncate"
                    title={suggestedSlug}
                  >
                    {suggestedSlug === "" ? "Sugestia" : suggestedSlug}
                  </Button>
                ) : null}
              </div>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">aktywny</SelectItem>
                    <SelectItem value="completed">zakończony</SelectItem>
                    <SelectItem value="suspended">zawieszony</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="visibility"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Publiczność</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">wewnętrzny</SelectItem>
                    <SelectItem value="public">publiczny</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>
        <Controller
          name="productionUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Link produkcyjny</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="https://..."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="driveFolderUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Folder Google Drive</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="https://drive.google.com/..."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="projectCardDriveUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Karta projektu</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="https://docs.google.com/..."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        {status === "completed" ? (
          <Controller
            name="reportDriveUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Sprawozdanie</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="https://docs.google.com/..."
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        ) : null}
        {mode === "create" ? (
          <Controller
            name="repositoryFullNames"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Repozytoria GitHub</FieldLabel>
                {repoOptions.length === 0 ? (
                  <FieldDescription>
                    Integracja z GitHub nie jest skonfigurowana albo organizacja
                    nie ma repozytoriów — repozytoria można podłączyć później.
                  </FieldDescription>
                ) : (
                  <div className="space-y-2">
                    {slug.trim() !== "" && suggestedRepoOptions.length > 0 ? (
                      <div className="bg-muted/40 rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            Sugerowane dla slugu:{" "}
                            {declineNumeric(
                              suggestedRepoOptions.length,
                              "repozytorium",
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange([
                                ...new Set([
                                  ...field.value,
                                  ...suggestedRepoValues,
                                ]),
                              ]);
                            }}
                          >
                            Wybierz wszystkie
                          </Button>
                        </div>
                        <p className="text-muted-foreground mt-1 truncate">
                          {suggestedRepoOptions
                            .map((repo) => repo.label)
                            .join(", ")}
                        </p>
                      </div>
                    ) : null}
                    <MultiSelect
                      options={repoOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Wybierz repozytoria"
                    />
                  </div>
                )}
              </Field>
            )}
          />
        ) : null}
        {mode === "edit" ? (
          <Field>
            <FieldLabel>Role w całym projekcie</FieldLabel>
            <FieldDescription>
              Role z zakresem projektu, np. Product Owner, przypisują osobę do
              całego projektu poza zespołami.
            </FieldDescription>
            <div className="space-y-2">
              {projectRoles.fields.map((role, index) => (
                <div
                  key={role.id}
                  className="flex flex-wrap gap-2 rounded-md border p-2"
                >
                  <Controller
                    name={`projectRoles.${index}.memberId`}
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="min-w-48 flex-1">
                          <SelectValue placeholder="Osoba" />
                        </SelectTrigger>
                        <SelectContent>
                          {memberOptions.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    name={`projectRoles.${index}.roleDefinitionId`}
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="min-w-44 flex-1">
                          <SelectValue placeholder="Rola" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectRoleDefinitions.map((roleDefinition) => (
                            <SelectItem
                              key={roleDefinition.id}
                              value={roleDefinition.id}
                            >
                              {roleDefinition.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    name={`projectRoles.${index}.startedAt`}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="date"
                        aria-label="Data objęcia roli"
                        className="w-40"
                      />
                    )}
                  />
                  <Controller
                    name={`projectRoles.${index}.endedAt`}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="date"
                        aria-label="Data zakończenia roli"
                        className="w-40"
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Usuń rolę"
                    onClick={() => {
                      projectRoles.remove(index);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={
                  memberOptions.length === 0 ||
                  projectRoleDefinitions.length === 0
                }
                onClick={() => {
                  projectRoles.append({
                    memberId: "",
                    roleDefinitionId: projectRoleDefinitions[0]?.id ?? "",
                    startedAt: new Date().toISOString().slice(0, 10),
                    endedAt: "",
                  });
                }}
              >
                <Plus />
                Dodaj rolę projektową
              </Button>
            </div>
          </Field>
        ) : null}
        {submitError === null ? null : (
          <FieldDescription className="text-destructive">
            {submitError}
          </FieldDescription>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {mode === "create" ? <Plus /> : <Save />}
            {mode === "create" ? "Utwórz projekt" : "Zapisz"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.back();
            }}
          >
            Anuluj
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
