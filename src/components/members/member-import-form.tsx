"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

import type {
  MemberImportPreviewResult,
  MemberImportSummary,
} from "@/actions/members";
import { commitMemberImport, previewMemberImport } from "@/actions/members";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberImportFormValues } from "@/lib/schemas/members";
import {
  memberImportCommitSchema,
  memberImportFormSchema,
} from "@/lib/schemas/members";

const sheetTypeLabels: Record<MemberImportFormValues["sheetType"], string> = {
  active: "Aktywni",
  new: "Nowo przyjęci",
  inactive: "Nieaktywni",
  honorary: "Honorowi",
};

export function MemberImportForm() {
  const [preview, setPreview] = useState<MemberImportPreviewResult | null>(
    null,
  );
  const [summary, setSummary] = useState<MemberImportSummary | null>(null);

  if (summary !== null) {
    return (
      <div className="max-w-3xl space-y-4">
        <ImportSummaryView summary={summary} />
        <Button
          variant="outline"
          onClick={() => {
            setPreview(null);
            setSummary(null);
          }}
        >
          Importuj kolejny plik
        </Button>
      </div>
    );
  }

  if (preview !== null) {
    return (
      <MemberImportReviewTable
        preview={preview}
        onBack={() => {
          setPreview(null);
        }}
        onCommitted={setSummary}
      />
    );
  }

  return <MemberImportUploadForm onParsed={setPreview} />;
}

function MemberImportUploadForm({
  onParsed,
}: {
  onParsed: (preview: MemberImportPreviewResult) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<MemberImportFormValues>({
    resolver: zodResolver(memberImportFormSchema),
    defaultValues: { sheetType: "active" },
  });

  async function onSubmit(values: MemberImportFormValues) {
    setSubmitError(null);
    try {
      const fileContents = await values.file.text();
      const preview = await previewMemberImport(values.sheetType, fileContents);
      onParsed(preview);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <div className="max-w-2xl">
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FieldGroup>
          <Controller
            name="sheetType"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Rodzaj listy</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sheetTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Wszystkim zaimportowanym osobom zostanie nadany status
                  odpowiadający wybranej liście.
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            name="file"
            control={form.control}
            render={({ field: { onChange, name }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={name}>Plik CSV/TSV</FieldLabel>
                <input
                  id={name}
                  name={name}
                  type="file"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => {
                    onChange(event.target.files?.[0]);
                  }}
                  className="border-input file:text-foreground rounded-md border px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <FieldDescription>
                  Eksport arkusza (Plik → Pobierz → Wartości rozdzielane
                  przecinkami/tabulatorami). Następny krok pozwoli sprawdzić i
                  poprawić dane każdej osoby przed zapisaniem.
                </FieldDescription>
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

          <div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Wczytuję…" : "Dalej"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

const reviewFormSchema = z.object({ rows: memberImportCommitSchema });
type ReviewFormValues = z.infer<typeof reviewFormSchema>;

function MemberImportReviewTable({
  preview,
  onBack,
  onCommitted,
}: {
  preview: MemberImportPreviewResult;
  onBack: () => void;
  onCommitted: (summary: MemberImportSummary) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rows: preview.rows.map(({ key, duplicateReason, ...row }) => row),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "rows" });
  const includedCount = form.watch("rows").filter((row) => row.include).length;

  const sectionOptions = useMemo(() => {
    const names = new Set(preview.existingSections.map((s) => s.name));
    for (const row of preview.rows) {
      for (const name of row.sectionNames) {
        names.add(name);
      }
    }
    return [...names]
      .toSorted((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [preview]);

  const parentOptions = useMemo(
    () =>
      preview.existingMembers.map((existingMember) => ({
        value: existingMember.id,
        label: existingMember.fullName,
      })),
    [preview],
  );

  async function onSubmit(values: ReviewFormValues) {
    setSubmitError(null);
    try {
      const summary = await commitMemberImport(values.rows);
      onCommitted(summary);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {preview.missingColumns.length === 0 ? null : (
        <p className="text-muted-foreground text-sm">
          Brakujące kolumny w pliku (zignorowane):{" "}
          {preview.missingColumns.join(", ")}
        </p>
      )}
      {preview.blankRowsSkipped === 0 ? null : (
        <p className="text-muted-foreground text-sm">
          Pominięto {preview.blankRowsSkipped} pustych wierszy.
        </p>
      )}

      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        noValidate
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Import</TableHead>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>GitHub</TableHead>
                <TableHead>Sekcje</TableHead>
                <TableHead>Rodzic</TableHead>
                <TableHead>Notatki z arkusza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((rowField, index) => {
                const previewRow = preview.rows[index];
                return (
                  <TableRow key={rowField.id}>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.include`}
                        control={form.control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked === true);
                            }}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.fullName`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <div className="min-w-40">
                            <Input
                              {...field}
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid ? (
                              <FieldError errors={[fieldState.error]} />
                            ) : null}
                          </div>
                        )}
                      />
                      {previewRow.duplicateReason === null ? null : (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {previewRow.duplicateReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.email`}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="min-w-48"
                            placeholder="brak"
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.githubUsername`}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="min-w-32"
                            placeholder="brak"
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.sectionNames`}
                        control={form.control}
                        render={({ field }) => (
                          <div className="min-w-40">
                            <MultiSelect
                              options={sectionOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Sekcje"
                            />
                          </div>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`rows.${index}.parentId`}
                        control={form.control}
                        render={({ field }) => (
                          <div className="min-w-48">
                            <Combobox
                              options={parentOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder={
                                previewRow.parentNameRaw === ""
                                  ? "Brak"
                                  : `Automatycznie: "${previewRow.parentNameRaw}" przy zapisie`
                              }
                            />
                          </div>
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-64 min-w-48 text-xs whitespace-pre-wrap">
                      {previewRow.noteLines.length === 0
                        ? "—"
                        : previewRow.noteLines.join("\n")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {submitError === null ? null : (
          <FieldDescription className="text-destructive mt-2">
            {submitError}
          </FieldDescription>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Importuję…"
              : `Zatwierdź import (${includedCount})`}
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Wróć
          </Button>
        </div>
      </form>
    </div>
  );
}

function ImportSummaryView({ summary }: { summary: MemberImportSummary }) {
  const problemRows = summary.rows.filter((row) => row.outcome !== "created");

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap gap-2">
        <Badge>Utworzono: {summary.created}</Badge>
        {summary.skipped > 0 ? (
          <Badge variant="secondary">
            Pominięto duplikaty: {summary.skipped}
          </Badge>
        ) : null}
        {summary.errors > 0 ? (
          <Badge variant="destructive">Błędy: {summary.errors}</Badge>
        ) : null}
      </div>

      {problemRows.length === 0 ? null : (
        <ul className="space-y-1 text-sm">
          {problemRows.map((row) => (
            <li key={row.rowNumber}>
              Wiersz {row.rowNumber} — {row.fullName || "(brak imienia)"}:{" "}
              {row.outcome === "skipped_duplicate" ? "pominięto" : "błąd"}
              {row.detail === undefined ? "" : ` — ${row.detail}`}
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-sm">
        Nierozpoznani rodzice i pozostałe dane bez odpowiednika w formularzu
        (dawne projekty, role, uwagi) trafiły do notatek HR nowo utworzonych
        osób — sprawdź je na profilach.
      </p>
    </div>
  );
}
