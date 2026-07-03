import * as z from "zod";

export const emailSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  kind: z.enum(["login", "notification"]),
});

export const roleAssignmentFieldSchema = z.object({
  roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
  boardTermId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  startedAt: z.string().trim().optional(),
  endedAt: z.string().trim().optional(),
});

export const studyYearOptions = [
  "I inżynierski",
  "II inżynierski",
  "III inżynierski",
  "IV inżynierski",
  "I magisterski",
  "II magisterski",
  "doktorat",
] as const;

export const memberStatusOptions = [
  "new",
  "active",
  "inactive",
  "honorary",
] as const;
export type MemberStatus = (typeof memberStatusOptions)[number];

export type EmailKind = z.infer<typeof emailSchema>["kind"];

export const memberFormSchema = z.object({
  fullName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  parentId: z.string().trim().optional().or(z.literal("")),
  githubUsername: z.string().trim().max(64).optional().or(z.literal("")),
  discordId: z.string().trim().max(32).optional().or(z.literal("")),
  facebookUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  linkedinUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  instagramUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  websiteUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  photoUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  studentIndex: z.string().trim().max(32).optional().or(z.literal("")),
  studyDepartment: z.string().trim().max(160).optional().or(z.literal("")),
  studyField: z.string().trim().max(160).optional().or(z.literal("")),
  studyYear: z.enum(studyYearOptions).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  hrNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(memberStatusOptions),
  emails: z.array(emailSchema).min(1, "Podaj co najmniej jeden adres e-mail"),
  // Create-mode only: initial role assignments, and whether to skip
  // GitHub/Discord invites when adding a member who already has an account
  // (e.g. importing an existing member).
  roleAssignments: z.array(roleAssignmentFieldSchema),
  sendGithubInvite: z.boolean().optional(),
  sendDiscordInvite: z.boolean().optional(),
});

export type MemberFormInput = z.input<typeof memberFormSchema>;
export type MemberFormValues = z.infer<typeof memberFormSchema>;

export const memberImportSheetTypeOptions = [
  "active",
  "new",
  "inactive",
  "honorary",
] as const;

export const memberImportFormSchema = z.object({
  sheetType: z.enum(memberImportSheetTypeOptions),
  file: z.instanceof(File, { message: "Wybierz plik" }),
});

export type MemberImportFormValues = z.infer<typeof memberImportFormSchema>;

/**
 * One editable row in the import preview/review table. Every field is a
 * plain trimmed string ("" for empty) rather than string|null, since these
 * are bound directly to controlled inputs in the review grid.
 */
export const memberImportRowSchema = z.object({
  rowNumber: z.number(),
  include: z.boolean(),
  fullName: z.string().trim().min(1, "Podaj imię i nazwisko"),
  status: z.enum(memberStatusOptions),
  email: z.string().trim(),
  emailKind: z.enum(["login", "notification"]),
  githubUsername: z.string().trim(),
  discordId: z.string().trim(),
  facebookUrl: z.string().trim(),
  studentIndex: z.string().trim(),
  studyDepartment: z.string().trim(),
  studyField: z.string().trim(),
  studyYear: z.string().trim(),
  joinedAt: z.string().trim(),
  sectionNames: z.array(z.string().trim()),
  // Explicit board choice; "" means "let the import try to auto-match
  // parentNameRaw against everyone in this batch/the database instead".
  parentId: z.string().trim(),
  parentNameRaw: z.string().trim(),
  noteLines: z.array(z.string().trim()),
});

export const memberImportCommitSchema = z.array(memberImportRowSchema);

export type MemberImportRowInput = z.infer<typeof memberImportRowSchema>;
export type MemberImportCommitInput = z.infer<typeof memberImportCommitSchema>;
