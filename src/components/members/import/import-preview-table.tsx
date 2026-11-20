"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { Control, UseFormReturn } from "react-hook-form";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UniversityInfoOptions } from "@/lib/integrations/topwr";
import type {
  RecruitmentAnalysis,
  RecruitmentPreviewRow,
} from "@/lib/member-import/recruitment";
import type { RecruitmentImportRowInput } from "@/lib/schemas/member-import";
import { recruitmentImportRowSchema } from "@/lib/schemas/member-import";
import { studyYearOptions } from "@/lib/schemas/members";
import { cn } from "@/lib/utils";

const previewFormSchema = z.object({
  rows: z.array(recruitmentImportRowSchema),
});
type PreviewFormInput = z.input<typeof previewFormSchema>;
type PreviewFormValues = z.infer<typeof previewFormSchema>;
type PreviewForm = UseFormReturn<PreviewFormInput, unknown, PreviewFormValues>;

const emptySelectValue = "__empty";

export function ImportPreviewTable({
  analysis,
  sections,
  universityInfo,
  onBack,
  onSubmit,
}: {
  analysis: RecruitmentAnalysis;
  sections: { id: string; name: string }[];
  universityInfo: UniversityInfoOptions;
  onBack: () => void;
  onSubmit: (rows: RecruitmentImportRowInput[]) => Promise<string | null>;
}) {
  const [showAll, setShowAll] = useState(false);
  const form = useForm<PreviewFormInput, unknown, PreviewFormValues>({
    resolver: zodResolver(previewFormSchema),
    defaultValues: {
      rows: analysis.rows.map(
        ({ accepted, warnings, duplicateReason, ...row }) => row,
      ),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "rows" });
  const included = useWatch({
    control: form.control,
    name: fields.map((_, index) => `rows.${index}.include` as const),
  });

  const acceptedCount = analysis.rows.filter((row) => row.accepted).length;
  const includedCount = included.filter(Boolean).length;
  const visibleRows = analysis.rows
    .map((previewRow, index) => ({ previewRow, index }))
    .filter(
      ({ previewRow, index }) =>
        showAll || previewRow.accepted || included[index],
    );

  const sectionOptions = sections.map((section) => ({
    value: section.id,
    label: section.name,
  }));

  async function submit(values: PreviewFormValues) {
    try {
      const error = await onSubmit(values.rows);
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
      onSubmit={(event) =>
        void form.handleSubmit(submit, (errors) => {
          const invalidRowNumbers = analysis.rows
            .filter((_, index) => errors.rows?.[index] !== undefined)
            .map((row) => row.rowNumber);
          form.setError("root", {
            message: `Popraw podświetlone pola przed importem (wiersze: ${invalidRowNumbers.join(", ")}).`,
          });
        })(event)
      }
      noValidate
      className="space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Przyjętych: {acceptedCount} z {analysis.rows.length} zgłoszonych · do
          importu: {includedCount}
        </p>
        <label
          htmlFor="show-all-applicants"
          className="flex items-center gap-2 text-sm"
        >
          <Checkbox
            id="show-all-applicants"
            checked={showAll}
            onCheckedChange={(checked) => {
              setShowAll(checked === true);
            }}
          />
          Pokaż wszystkich zgłoszonych ({analysis.rows.length})
        </label>
      </div>

      <p className="text-muted-foreground max-w-3xl text-sm">
        Każdy zaznaczony wiersz zostanie dodany jako nowy członek (status
        „nowy”) z rolą członka wybranych sekcji. Osoby, które już są w HRowniku,
        są pomijane — import nikogo nie nadpisuje.
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Import</TableHead>
              <TableHead>Osoba</TableHead>
              <TableHead>Indeks</TableHead>
              <TableHead>Konta</TableHead>
              <TableHead>Studia</TableHead>
              <TableHead>Sekcje</TableHead>
              <TableHead>Uwagi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  Nikt w pliku nie ma przypisanej sekcji. Pokaż wszystkich
                  zgłoszonych, żeby wybrać osoby ręcznie.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map(({ previewRow, index }) => (
                <PreviewRow
                  key={fields[index].id}
                  form={form}
                  index={index}
                  previewRow={previewRow}
                  sectionOptions={sectionOptions}
                  universityInfo={universityInfo}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {form.formState.errors.root === undefined ? null : (
        <FieldError errors={[form.formState.errors.root]} />
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || includedCount === 0}
        >
          {form.formState.isSubmitting
            ? "Importuję…"
            : `Importuj zaznaczonych (${includedCount})`}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          Wróć do mapowania
        </Button>
      </div>
    </form>
  );
}

function PreviewRow({
  form,
  index,
  previewRow,
  sectionOptions,
  universityInfo,
}: {
  form: PreviewForm;
  index: number;
  previewRow: RecruitmentPreviewRow;
  sectionOptions: { value: string; label: string }[];
  universityInfo: UniversityInfoOptions;
}) {
  const [include, department, studyYear, studyField] = useWatch({
    control: form.control,
    name: [
      `rows.${index}.include`,
      `rows.${index}.studyDepartment`,
      `rows.${index}.studyYear`,
      `rows.${index}.studyField`,
    ],
  });
  const label = (name: string) => `${name} (wiersz ${previewRow.rowNumber})`;

  const degree = studyYear.includes("inżynierski")
    ? "1DEGREE"
    : studyYear.includes("magisterski")
      ? "2DEGREE"
      : null;
  const fieldOptions = universityInfo.fieldsOfStudy
    .filter(
      (field) =>
        field.value === studyField ||
        ((department === "" || field.department === department) &&
          (degree === null || field.studiesType === degree)),
    )
    .map((field) => ({
      value: field.value,
      label: department === "" ? field.value : field.label,
    }));

  return (
    <TableRow
      className={cn("align-top", !include && "opacity-60")}
      data-row-number={previewRow.rowNumber}
    >
      <TableCell>
        <Controller
          name={`rows.${index}.include`}
          control={form.control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              disabled={previewRow.duplicateReason !== null}
              aria-label={label("Importuj")}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
              }}
            />
          )}
        />
      </TableCell>

      <TableCell className="min-w-72 space-y-1.5">
        <TextField
          control={form.control}
          name={`rows.${index}.fullName`}
          label={label("Imię i nazwisko")}
        />
        <TextField
          control={form.control}
          name={`rows.${index}.email`}
          label={label("E-mail")}
          placeholder="e-mail"
        />
        <Controller
          name={`rows.${index}.emailKind`}
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                className="w-full"
                aria-label={label("Rodzaj adresu e-mail")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="login">logowanie</SelectItem>
                <SelectItem value="notification">powiadomienia</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>

      <TableCell className="min-w-28">
        <TextField
          control={form.control}
          name={`rows.${index}.studentIndex`}
          label={label("Indeks")}
          placeholder="brak"
        />
      </TableCell>

      <TableCell className="min-w-48 space-y-1.5">
        <TextField
          control={form.control}
          name={`rows.${index}.githubUsername`}
          label={label("GitHub")}
          placeholder="GitHub"
        />
        <TextField
          control={form.control}
          name={`rows.${index}.discordId`}
          label={label("Discord")}
          placeholder="Discord"
        />
        <TextField
          control={form.control}
          name={`rows.${index}.facebookUrl`}
          label={label("Facebook")}
          placeholder="Facebook (link)"
        />
      </TableCell>

      <TableCell className="min-w-64 space-y-1.5">
        <Controller
          name={`rows.${index}.studyDepartment`}
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value === "" ? emptySelectValue : field.value}
              onValueChange={(value) => {
                const next = value === emptySelectValue ? "" : value;
                field.onChange(next);
                const currentField = universityInfo.fieldsOfStudy.find(
                  (option) => option.value === studyField,
                );
                if (
                  currentField !== undefined &&
                  next !== "" &&
                  currentField.department !== next
                ) {
                  form.setValue(`rows.${index}.studyField`, "");
                }
              }}
            >
              <SelectTrigger className="w-full" aria-label={label("Wydział")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>Wydział: brak</SelectItem>
                {universityInfo.departments.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Controller
          name={`rows.${index}.studyField`}
          control={form.control}
          render={({ field }) => (
            <Combobox
              options={fieldOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Kierunek"
              aria-label={label("Kierunek")}
            />
          )}
        />
        <Controller
          name={`rows.${index}.studyYear`}
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value === "" ? emptySelectValue : field.value}
              onValueChange={(value) => {
                field.onChange(value === emptySelectValue ? "" : value);
              }}
            >
              <SelectTrigger className="w-full" aria-label={label("Rok")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>Rok: brak</SelectItem>
                {studyYearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>

      <TableCell className="min-w-48">
        <Controller
          name={`rows.${index}.sectionIds`}
          control={form.control}
          render={({ field }) => (
            <MultiSelect
              options={sectionOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Sekcje"
              aria-label={label("Sekcje")}
            />
          )}
        />
      </TableCell>

      <TableCell className="min-w-56 space-y-1 text-xs whitespace-normal">
        {previewRow.accepted ? null : (
          <Badge variant="outline">nieprzyjęty w rekrutacji</Badge>
        )}
        {previewRow.duplicateReason === null ? null : (
          <p className="text-muted-foreground">
            Pominięty: {previewRow.duplicateReason}
          </p>
        )}
        {previewRow.duplicateReason !== null ||
        previewRow.warnings.length === 0 ? null : (
          <ul className="space-y-0.5 text-amber-700 dark:text-amber-400">
            {previewRow.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </TableCell>
    </TableRow>
  );
}

type TextFieldName = `rows.${number}.${
  | "fullName"
  | "email"
  | "studentIndex"
  | "githubUsername"
  | "discordId"
  | "facebookUrl"}`;

function TextField({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<PreviewFormInput, unknown, PreviewFormValues>;
  name: TextFieldName;
  label: string;
  placeholder?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div>
          <Input
            {...field}
            aria-label={label}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
          />
          {fieldState.invalid ? (
            <FieldDescription className="text-destructive text-xs">
              {fieldState.error?.message}
            </FieldDescription>
          ) : null}
        </div>
      )}
    />
  );
}
