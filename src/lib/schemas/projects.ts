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
  visibility: z.enum(["internal", "public"]),
  productionUrl: z.url("Podaj poprawny adres URL").optional().or(z.literal("")),
  driveFolderUrl: z
    .url("Podaj poprawny adres URL")
    .optional()
    .or(z.literal("")),
  repositoryFullNames: z.array(z.string().trim()),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
