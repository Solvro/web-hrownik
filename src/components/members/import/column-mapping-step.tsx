"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ColumnMapping,
  MappingConfidence,
  RecruitmentImportField,
} from "@/lib/member-import/columns";
import {
  recruitmentImportFieldLabels,
  requiredMappingLabels,
} from "@/lib/member-import/columns";
import type { RecruitmentAnalysis } from "@/lib/member-import/recruitment";
import type { ColumnMappingFormValues } from "@/lib/schemas/member-import";
import {
  columnMappingFormSchema,
  toColumnMapping,
  toColumnMappingFormValues,
} from "@/lib/schemas/member-import";

const notImported = "__none";

const fieldGroups: {
  legend: string;
  fields: RecruitmentImportField[];
}[] = [
  {
    legend: "Wymagane",
    fields: ["firstName", "lastName", "fullName", "email"],
  },
  {
    legend: "Zgłoszenie i studia",
    fields: [
      "externalId",
      "sections",
      "studentIndex",
      "studyDepartment",
      "studyField",
      "studyYear",
    ],
  },
  {
    legend: "Konta",
    fields: ["githubUsername", "githubPortfolio", "discordId", "facebookUrl"],
  },
];

const fieldDescriptions: Partial<Record<RecruitmentImportField, string>> = {
  fullName: "Zamiast dwóch osobnych kolumn z imieniem i nazwiskiem.",
  externalId:
    "Pozwala bezpiecznie wgrać kolejny eksport z tej samej rekrutacji.",
  sections:
    "Osoby z pustą wartością w tej kolumnie są traktowane jako nieprzyjęte.",
  githubPortfolio: "Używane tylko, gdy to link do github.com.",
};

const confidenceLabels: Record<MappingConfidence, string> = {
  high: "pewność wysoka",
  medium: "pewność średnia",
  low: "pewność niska",
};

export function ColumnMappingStep({
  analysis,
  onBack,
  onConfirm,
}: {
  analysis: RecruitmentAnalysis;
  onBack: () => void;
  onConfirm: (mapping: ColumnMapping) => Promise<string | null>;
}) {
  const form = useForm<ColumnMappingFormValues>({
    resolver: zodResolver(columnMappingFormSchema),
    defaultValues: toColumnMappingFormValues(analysis.mapping),
  });

  // Headers can repeat or be blank, so a column is identified by position.
  const columns = analysis.headers.map((header, index) => ({
    value: String(index),
    label: `${index + 1}. ${header || "(bez nazwy)"}`,
  }));

  async function onSubmit(values: ColumnMappingFormValues) {
    try {
      const error = await onConfirm(toColumnMapping(values));
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
      className="max-w-3xl space-y-6"
    >
      <p className="text-muted-foreground text-sm">
        Sprawdź, z której kolumny pliku pochodzi każde pole. Kolumny bez
        odpowiednika w HRowniku — odpowiedzi otwarte, zadanie rekrutacyjne,
        termin rozmowy, wolne myśli czy wstępne wybory sekcji — nie są
        importowane.
      </p>

      {analysis.missingFields.length === 0 ? null : (
        <Alert variant="destructive">
          <AlertTitle>Nie znaleziono wymaganych kolumn</AlertTitle>
          <AlertDescription>
            Wskaż ręcznie:{" "}
            {analysis.missingFields
              .map((field) => requiredMappingLabels[field])
              .join(", ")}
            .
          </AlertDescription>
        </Alert>
      )}

      {fieldGroups.map((group) => (
        <FieldSet key={group.legend}>
          <FieldLegend>{group.legend}</FieldLegend>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((importField) => (
              <Controller
                key={importField}
                name={importField}
                control={form.control}
                render={({ field, fieldState }) => {
                  const detected = analysis.detected[importField];
                  const isDetected =
                    detected !== undefined &&
                    field.value === String(detected.columnIndex);
                  return (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`mapping-${importField}`}>
                        {recruitmentImportFieldLabels[importField]}
                      </FieldLabel>
                      <Select
                        value={field.value === "" ? notImported : field.value}
                        onValueChange={(value) => {
                          field.onChange(value === notImported ? "" : value);
                        }}
                      >
                        <SelectTrigger
                          id={`mapping-${importField}`}
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={notImported}>
                            — nie importuj —
                          </SelectItem>
                          {columns.map((column) => (
                            <SelectItem key={column.value} value={column.value}>
                              <span className="truncate">{column.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isDetected ? (
                        <Badge variant="secondary" className="w-fit">
                          wykryto automatycznie ·{" "}
                          {confidenceLabels[detected.confidence]}
                        </Badge>
                      ) : null}
                      {fieldDescriptions[importField] === undefined ? null : (
                        <FieldDescription>
                          {fieldDescriptions[importField]}
                        </FieldDescription>
                      )}
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  );
                }}
              />
            ))}
          </FieldGroup>
        </FieldSet>
      ))}

      {form.formState.errors.root === undefined ? null : (
        <FieldError errors={[form.formState.errors.root]} />
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Wczytuję…" : "Dalej: podgląd"}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          Wróć
        </Button>
      </div>
    </form>
  );
}
