import * as z from "zod";

import type {
  ColumnMapping,
  RecruitmentImportField,
} from "@/lib/member-import/columns";
import {
  missingRequiredFields,
  recruitmentImportFieldLabels,
  recruitmentImportFields,
  requiredMappingLabels,
} from "@/lib/member-import/columns";
import { githubUsernamePattern } from "@/lib/member-import/normalize";
import { studyYearOptions } from "@/lib/schemas/members";

export const maxImportFileBytes = 5 * 1024 * 1024;

const importFileSchema = z
  .instanceof(File, { message: "Wybierz plik" })
  .refine((file) => /\.(?:xlsx|csv)$/i.test(file.name), {
    error: "Wybierz plik .xlsx (eksport z Eventownika) albo .csv",
  })
  .refine((file) => file.size <= maxImportFileBytes, {
    error: "Plik jest za duży (maks. 5 MB)",
  });

const editionSchema = z
  .string()
  .trim()
  .min(1, "Podaj nazwę edycji rekrutacji")
  .max(120);

const joinedAtSchema = z.iso.date("Podaj datę dołączenia");

export const recruitmentUploadSchema = z.object({
  file: importFileSchema,
  edition: editionSchema,
  joinedAt: joinedAtSchema,
});

export type RecruitmentUploadValues = z.infer<typeof recruitmentUploadSchema>;

export const columnMappingSchema = z
  .partialRecord(z.enum(recruitmentImportFields), z.int().nonnegative())
  .refine(
    (mapping) => {
      const columns = Object.values(mapping);
      return new Set(columns).size === columns.length;
    },
    { error: "Każda kolumna może zasilać tylko jedno pole." },
  );

/** What the analyze action accepts: the file plus an optional mapping override (JSON). */
export const recruitmentAnalyzeInputSchema = z.object({
  file: importFileSchema,
  mapping: z
    .string()
    .trim()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({
          code: "custom",
          message: "Nieprawidłowe mapowanie kolumn.",
        });
        return z.NEVER;
      }
    })
    .pipe(columnMappingSchema)
    .optional(),
});

/**
 * Mapping step form: one select per field, holding a column index as a
 * string or "" for "not imported".
 */
export const columnMappingFormSchema = z
  .record(z.enum(recruitmentImportFields), z.string().trim())
  .superRefine((values, context) => {
    const mapping = toColumnMapping(values);
    for (const missing of missingRequiredFields(mapping)) {
      context.addIssue({
        code: "custom",
        path: [
          missing === "email"
            ? "email"
            : mapping.firstName === undefined
              ? "firstName"
              : "lastName",
        ],
        message: `Wskaż kolumnę: ${requiredMappingLabels[missing]}`,
      });
    }
    const fieldByColumn = new Map<number, RecruitmentImportField>();
    for (const field of recruitmentImportFields) {
      const column = mapping[field];
      if (column === undefined) {
        continue;
      }
      const previous = fieldByColumn.get(column);
      if (previous === undefined) {
        fieldByColumn.set(column, field);
      } else {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `Ta kolumna jest już przypisana do pola „${recruitmentImportFieldLabels[previous]}”`,
        });
      }
    }
  });

export type ColumnMappingFormValues = z.infer<typeof columnMappingFormSchema>;

export function toColumnMapping(
  values: ColumnMappingFormValues,
): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of recruitmentImportFields) {
    if (values[field] !== "") {
      mapping[field] = Number(values[field]);
    }
  }
  return mapping;
}

export function toColumnMappingFormValues(
  mapping: ColumnMapping,
): ColumnMappingFormValues {
  return Object.fromEntries(
    recruitmentImportFields.map((field) => [
      field,
      mapping[field] === undefined ? "" : String(mapping[field]),
    ]),
  ) as ColumnMappingFormValues;
}

/**
 * One reviewed row of the import preview. Fields are plain trimmed strings
 * ("" = empty) bound to inputs; they're only required to be valid when the
 * row is going to be imported.
 */
export const recruitmentImportRowSchema = z
  .object({
    rowNumber: z.int().positive(),
    externalId: z.string().trim().max(100),
    include: z.boolean(),
    fullName: z.string().trim().max(120),
    email: z.string().trim().toLowerCase().max(254),
    emailKind: z.enum(["login", "notification"]),
    studentIndex: z.string().trim(),
    githubUsername: z.string().trim(),
    discordId: z.string().trim(),
    facebookUrl: z.string().trim(),
    studyDepartment: z.string().trim().max(160),
    studyField: z.string().trim().max(160),
    studyYear: z.enum(studyYearOptions).or(z.literal("")),
    sectionIds: z.array(z.string().trim().min(1)).max(20),
    // Not rendered yet: auto-invites after import are a later step (see
    // PLAN.md, Fazy 5–7), so these always arrive as false for now.
    onboarding: z.object({
      githubInvite: z.boolean().default(false),
      discordInvite: z.boolean().default(false),
    }),
  })
  .superRefine((row, context) => {
    if (!row.include) {
      return;
    }
    const issue = (path: string, message: string) => {
      context.addIssue({ code: "custom", path: [path], message });
    };
    if (row.fullName.length < 2) {
      issue("fullName", "Podaj imię i nazwisko");
    }
    if (!z.email().safeParse(row.email).success) {
      issue("email", "Podaj poprawny adres e-mail");
    }
    if (row.studentIndex !== "" && !/^\d{6}$/.test(row.studentIndex)) {
      issue("studentIndex", "Indeks to 6 cyfr");
    }
    if (
      row.githubUsername !== "" &&
      !githubUsernamePattern.test(row.githubUsername)
    ) {
      issue("githubUsername", "Nieprawidłowa nazwa użytkownika GitHub");
    }
    if (row.discordId !== "" && !/^\S{2,32}$/.test(row.discordId)) {
      issue("discordId", "Nieprawidłowa nazwa lub ID Discorda");
    }
    if (
      row.facebookUrl !== "" &&
      !z.url({ protocol: /^https?$/ }).safeParse(row.facebookUrl).success
    ) {
      issue("facebookUrl", "Podaj link zaczynający się od http(s)://");
    }
  });

export type RecruitmentImportRowInput = z.input<
  typeof recruitmentImportRowSchema
>;
export type RecruitmentImportRow = z.infer<typeof recruitmentImportRowSchema>;

export const recruitmentCommitSchema = z.object({
  edition: editionSchema,
  joinedAt: joinedAtSchema,
  rows: z.array(recruitmentImportRowSchema).max(2000),
});

export type RecruitmentCommitInput = z.input<typeof recruitmentCommitSchema>;
