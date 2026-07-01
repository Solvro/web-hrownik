"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { assignProjectMemberToTeam } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  teamId: z.string().trim().min(1),
  newTeamName: z.string().trim(),
  role: z.string().trim(),
});

type FormValues = z.infer<typeof formSchema>;

export function AssignActivityMemberToTeam({
  projectId,
  memberId,
  teams,
}: {
  projectId: string;
  memberId: string;
  teams: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamId: teams[0]?.id ?? "new",
      newTeamName: "",
      role: "członek zespołu",
    },
  });
  const teamId = form.watch("teamId");

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await assignProjectMemberToTeam({
        projectId,
        memberId,
        teamId: values.teamId,
        newTeamName: values.newTeamName,
        role: values.role,
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Błąd");
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 shrink-0 px-2"
        onClick={() => {
          setOpen(true);
        }}
      >
        <UserPlus />
        Dodaj do zespołu
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      className="bg-muted/40 flex flex-wrap items-start gap-2 rounded-md border p-2"
    >
      <Controller
        name="teamId"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
              <SelectItem value="new">nowy zespół</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      {teamId === "new" ? (
        <Controller
          name="newTeamName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1">
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                placeholder="Nazwa zespołu"
                className="h-8 w-36"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      ) : null}
      <Controller
        name="role"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              placeholder="Rola"
              className="h-8 w-36"
            />
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : null}
          </Field>
        )}
      />
      <Button
        type="submit"
        size="sm"
        className="h-8"
        disabled={form.formState.isSubmitting}
      >
        <Plus />
        Dodaj
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => {
          setOpen(false);
        }}
      >
        Anuluj
      </Button>
      {submitError === null ? null : (
        <p className="text-destructive w-full text-xs">{submitError}</p>
      )}
    </form>
  );
}
