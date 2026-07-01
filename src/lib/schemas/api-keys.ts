import * as z from "zod";

export const apiKeyFormSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę").max(80),
});

export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;
