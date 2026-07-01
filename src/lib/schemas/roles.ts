import * as z from "zod";

export const roleAssignmentDraftSchema = z
  .object({
    roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
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
