import * as z from "zod";

export const sectionFormSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę sekcji").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SectionFormValues = z.infer<typeof sectionFormSchema>;
