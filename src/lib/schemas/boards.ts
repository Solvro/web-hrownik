import * as z from "zod";

export const boardTermFormSchema = z
  .object({
    name: z.string().trim().min(1, "Podaj nazwę kadencji").max(120),
    startsAt: z.string().trim().optional().or(z.literal("")),
    endsAt: z.string().trim().optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      value.startsAt === undefined ||
      value.startsAt === "" ||
      value.endsAt === undefined ||
      value.endsAt === "" ||
      value.startsAt <= value.endsAt,
    { error: "Data końca nie może być wcześniejsza niż data początku." },
  );

export type BoardTermFormValues = z.infer<typeof boardTermFormSchema>;
