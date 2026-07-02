import * as z from "zod";

export const roleAssignmentDraftSchema = z
  .object({
    roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
    boardTermId: z.string().trim().optional(),
    sectionId: z.string().trim().optional(),
    projectId: z.string().trim().optional(),
    startedAt: z.string().trim().optional(),
    endedAt: z.string().trim().optional(),
  })
  .refine(
    (value) =>
      !(value.sectionId !== undefined && value.projectId !== undefined),
    {
      error: "Rola nie może mieć jednocześnie sekcji i projektu.",
    },
  );

export type RoleAssignmentDraft = z.infer<typeof roleAssignmentDraftSchema>;

export const roleDefinitionFormSchema = z.object({
  scope: z.enum(["board", "section", "project_team", "project"]),
  name: z.string().trim().min(1, "Podaj nazwę roli").max(80),
  githubTeamSlug: z.string().trim().max(80).optional().or(z.literal("")),
  discordRoleId: z.string().trim().max(80).optional().or(z.literal("")),
  permissionGroupIds: z.array(z.string().trim()),
});

export type RoleDefinitionFormValues = z.infer<typeof roleDefinitionFormSchema>;
