import * as z from "zod";

export const projectFormSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę projektu").max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Tylko małe litery, cyfry i myślniki"),
  status: z.enum(["active", "completed", "suspended"]),
  startedAt: z.string().trim().optional(),
  visibility: z.enum(["internal", "public"]),
  productionUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  driveFolderUrl: z
    .url("Podaj poprawny adres URL")
    .optional()
    .or(z.literal("")),
  projectCardDriveUrl: z
    .url("Podaj poprawny adres URL")
    .optional()
    .or(z.literal("")),
  reportDriveUrl: z
    .url("Podaj poprawny adres URL")
    .optional()
    .or(z.literal("")),
  repositoryFullNames: z.array(z.string().trim()),
  projectRoles: z.array(
    z.object({
      memberId: z.string().trim().min(1, "Wybierz osobę"),
      roleDefinitionId: z.string().trim().min(1, "Wybierz rolę"),
      startedAt: z.string().trim().optional(),
      endedAt: z.string().trim().optional(),
    }),
  ),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
