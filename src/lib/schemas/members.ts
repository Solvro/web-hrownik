import * as z from "zod";

export const emailSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  kind: z.enum(["login", "notification"]),
});

export const roleAssignmentFieldSchema = z.object({
  roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
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

export const memberFormSchema = z.object({
  fullName: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  githubUsername: z.string().trim().max(64).optional().or(z.literal("")),
  discordId: z.string().trim().max(32).optional().or(z.literal("")),
  facebookUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  studentIndex: z.string().trim().max(32).optional().or(z.literal("")),
  studyDepartment: z.string().trim().max(160).optional().or(z.literal("")),
  studyField: z.string().trim().max(160).optional().or(z.literal("")),
  studyYear: z.enum(studyYearOptions).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  hrNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(memberStatusOptions),
  emails: z.array(emailSchema).min(1, "Podaj co najmniej jeden adres e-mail"),
  sectionIds: z.array(z.string().trim()),
  // Create-mode only: initial role assignments, and whether to skip
  // GitHub/Discord invites when adding a member who already has an account
  // (e.g. importing an existing member).
  roleAssignments: z.array(roleAssignmentFieldSchema),
  sendGithubInvite: z.boolean().optional(),
  sendDiscordInvite: z.boolean().optional(),
});

export type MemberFormInput = z.input<typeof memberFormSchema>;
export type MemberFormValues = z.infer<typeof memberFormSchema>;
