"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  password: z.string().trim().min(1, "Hasło jest wymagane"),
});

export default function LoginPage() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setFormError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/",
    });
    if (error !== null) {
      setFormError(error.message ?? "Nie udało się zalogować.");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Zaloguj się do HRownika</h1>
          <p className="text-muted-foreground text-sm">
            Wybierz metodę logowania
          </p>
        </div>

        <FieldGroup>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void authClient.signIn.oauth2({
                providerId: "keycloak",
                callbackURL: "/",
              });
            }}
          >
            Zaloguj przez Solvro Auth
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void authClient.signIn.usos({ callbackURL: "/" });
            }}
          >
            Zaloguj przez USOS
          </Button>
        </FieldGroup>

        <FieldSeparator>lub e-mailem</FieldSeparator>

        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Hasło</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            {formError === null ? null : (
              <FieldDescription className="text-destructive">
                {formError}
              </FieldDescription>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Zaloguj się
            </Button>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
