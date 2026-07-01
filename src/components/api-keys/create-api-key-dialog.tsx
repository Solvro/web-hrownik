"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createApiKey } from "@/actions/api-keys";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ApiKeyFormValues } from "@/lib/schemas/api-keys";
import { apiKeyFormSchema } from "@/lib/schemas/api-keys";

export function CreateApiKeyDialog({ onClose }: { onClose: () => void }) {
  const [created, setCreated] = useState<{
    name: string;
    secret: string;
  } | null>(null);

  return created === null ? (
    <ApiKeyNameForm onCreated={setCreated} />
  ) : (
    <RevealSecretContent
      name={created.name}
      secret={created.secret}
      onClose={() => {
        setCreated(null);
        onClose();
      }}
    />
  );
}

function ApiKeyNameForm({
  onCreated,
}: {
  onCreated: (created: { name: string; secret: string }) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: ApiKeyFormValues) {
    setSubmitError(null);
    try {
      const result = await createApiKey(values);
      form.reset();
      onCreated({ name: result.name, secret: result.secret });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nowy klucz API</DialogTitle>
        <DialogDescription>
          Klucz uprawnia do odczytu danych przez /api/v1. Zostanie pokazany
          tylko raz, zaraz po wygenerowaniu.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nazwa</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="np. Integracja Discord"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          {submitError === null ? null : (
            <FieldDescription className="text-destructive">
              {submitError}
            </FieldDescription>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anuluj
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Wygeneruj
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </DialogContent>
  );
}

function RevealSecretContent({
  name,
  secret,
  onClose,
}: {
  name: string;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <DialogContent
      showCloseButton={false}
      onInteractOutside={(event) => {
        event.preventDefault();
      }}
      onEscapeKeyDown={(event) => {
        event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>Klucz „{name}” gotowy</DialogTitle>
        <DialogDescription>
          To jedyny moment, w którym zobaczysz ten klucz. Skopiuj go teraz — po
          zamknięciu tego okna nie będzie już dostępny.
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2">
        <code className="bg-muted flex-1 overflow-x-auto rounded-md border px-3 py-2 text-sm break-all">
          {secret}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void copySecret()}
          aria-label="Skopiuj klucz"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Skopiowałem, zamknij
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
