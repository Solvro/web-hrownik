"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createProject } from "@/actions/projects";
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
import type { ProjectFormValues } from "@/lib/schemas/projects";
import { projectFormSchema } from "@/lib/schemas/projects";

export function ProjectForm({
  repoOptions,
}: {
  repoOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
      visibility: "internal",
      productionUrl: "",
      driveFolderUrl: "",
      projectCardDriveUrl: "",
      reportDriveUrl: "",
      repositoryFullNames: [],
    },
  });
  const slug = form.watch("slug");
  const status = form.watch("status");
  const suggestedRepoOptions = repoOptions.filter((repo) =>
    repo.label.toLowerCase().includes(slug.toLowerCase()),
  );
  const suggestedRepoValues = suggestedRepoOptions.map((repo) => repo.value);

  async function onSubmit(values: ProjectFormValues) {
    setSubmitError(null);
    try {
      await createProject(values);
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
              <Input
                {...field}
                id={field.name}
                placeholder="nazwa-projektu"
                aria-invalid={fieldState.invalid}
              />
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
                placeholder="https://drive.google.com/..."
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
                  placeholder="https://drive.google.com/..."
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        ) : null}
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
                          Sugerowane dla slugu: {suggestedRepoOptions.length}
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
        {submitError === null ? null : (
          <FieldDescription className="text-destructive">
            {submitError}
          </FieldDescription>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Utwórz projekt
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
