"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { createMember, updateMember } from "@/actions/members";
import type { RoleDefinitionOption } from "@/components/members/role-picker-fields";
import { RolePickerFields } from "@/components/members/role-picker-fields";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MemberFormInput, MemberFormValues } from "@/lib/schemas/members";
import {
  memberFormSchema,
  memberStatusOptions,
  studyYearOptions,
} from "@/lib/schemas/members";

const emptySelectValue = "__empty";

const studyDegreeOptions = [
  { value: "1DEGREE", label: "I stopień" },
  { value: "2DEGREE", label: "II stopień" },
] as const;

const memberStatusLabels: Record<(typeof memberStatusOptions)[number], string> =
  {
    new: "nowy",
    active: "aktywny",
    inactive: "nieaktywny",
    honorary: "honorowy",
  };

export function MemberForm({
  mode,
  memberId,
  fullAccess,
  sections,
  roleDefinitions,
  universityInfoOptions,
  defaultValues,
}: {
  mode: "create" | "edit";
  memberId?: string;
  fullAccess: boolean;
  sections: { id: string; name: string }[];
  roleDefinitions: RoleDefinitionOption[];
  universityInfoOptions: {
    departments: { id: string; value: string; label: string }[];
    fieldsOfStudy: {
      id: string;
      value: string;
      label: string;
      department: string;
      studiesType: string;
    }[];
  };
  defaultValues: MemberFormInput;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<MemberFormInput, unknown, MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues,
  });
  const emailFields = useFieldArray({ control: form.control, name: "emails" });
  const roleFields = useFieldArray({
    control: form.control,
    name: "roleAssignments",
  });
  const [studyDegree, setStudyDegree] = useState<string>(() => {
    const year = defaultValues.studyYear;
    if (year !== undefined && year !== "") {
      if (year.includes("inżynierski")) {
        return "1DEGREE";
      }
      if (year.includes("magisterski")) {
        return "2DEGREE";
      }
    }
    return "";
  });
  const selectedDepartment = form.watch("studyDepartment");
  const fieldOptions = universityInfoOptions.fieldsOfStudy.filter(
    (field) =>
      (selectedDepartment === undefined ||
        selectedDepartment === "" ||
        field.department === selectedDepartment) &&
      (studyDegree === "" || field.studiesType === studyDegree),
  );
  const yearOptions = studyYearOptions.filter(
    (year) =>
      studyDegree === "" ||
      (studyDegree === "1DEGREE" && year.includes("inżynierski")) ||
      (studyDegree === "2DEGREE" && year.includes("magisterski")),
  );

  async function onSubmit(values: MemberFormValues) {
    setSubmitError(null);
    try {
      if (mode === "create") {
        await createMember(values);
      } else if (memberId !== undefined) {
        await updateMember(memberId, values);
      }
    } catch (error) {
      // next/navigation's redirect() (called by the server action on
      // success) throws an internal control-flow error that must propagate.
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      setSubmitError(
        error instanceof Error ? error.message : "Coś poszło nie tak.",
      );
    }
  }

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      noValidate
      className="max-w-2xl"
    >
      <FieldGroup>
        {fullAccess ? (
          <>
            <Controller
              name="fullName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Imię i nazwisko</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="status"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {memberStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {memberStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </>
        ) : null}

        <Controller
          name="githubUsername"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>GitHub</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="nazwa-uzytkownika"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {mode === "create" ? (
          <Controller
            name="sendGithubInvite"
            control={form.control}
            render={({ field }) => (
              <label
                htmlFor={field.name}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  id={field.name}
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                  }}
                />
                Wyślij zaproszenie do organizacji GitHub
              </label>
            )}
          />
        ) : null}

        <Controller
          name="discordId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Discord ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {mode === "create" ? (
          <Controller
            name="sendDiscordInvite"
            control={form.control}
            render={({ field }) => (
              <label
                htmlFor={field.name}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  id={field.name}
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                  }}
                />
                Wygeneruj link zaproszenia na Discorda
              </label>
            )}
          />
        ) : null}

        <Controller
          name="facebookUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Facebook</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="https://facebook.com/..."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="studentIndex"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Indeks</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Tylko jeśli osoba jest studentem.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="studyDepartment"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Wydział</FieldLabel>
              <Select
                value={
                  field.value === undefined || field.value === ""
                    ? emptySelectValue
                    : field.value
                }
                onValueChange={(value) => {
                  field.onChange(value === emptySelectValue ? "" : value);
                  form.setValue("studyField", "");
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Wybierz wydział" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptySelectValue}>Brak</SelectItem>
                  {universityInfoOptions.departments.map((department) => (
                    <SelectItem key={department.id} value={department.value}>
                      {department.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Stopień studiów</FieldLabel>
          <Select
            value={studyDegree === "" ? emptySelectValue : studyDegree}
            onValueChange={(value) => {
              const nextValue = value === emptySelectValue ? "" : value;
              setStudyDegree(nextValue);
              form.setValue("studyField", "");
              form.setValue("studyYear", "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz stopień" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={emptySelectValue}>Brak filtra</SelectItem>
              {studyDegreeOptions.map((degree) => (
                <SelectItem key={degree.value} value={degree.value}>
                  {degree.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Filtr list poniżej. Wybierany automatycznie po wybraniu kierunku lub
            roku studiów.
          </FieldDescription>
        </Field>

        <Controller
          name="studyField"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Kierunek studiów</FieldLabel>
              <Combobox
                options={fieldOptions.map((f) => ({
                  value: f.value,
                  label: f.label,
                }))}
                value={field.value ?? ""}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value !== "") {
                    const selectedField = fieldOptions.find(
                      (f) => f.value === value,
                    );
                    if (selectedField !== undefined) {
                      if (
                        selectedDepartment === undefined ||
                        selectedDepartment === ""
                      ) {
                        form.setValue(
                          "studyDepartment",
                          selectedField.department,
                        );
                      }
                      if (
                        studyDegree === "" &&
                        (selectedField.studiesType === "1DEGREE" ||
                          selectedField.studiesType === "2DEGREE")
                      ) {
                        setStudyDegree(selectedField.studiesType);
                      }
                    }
                  }
                }}
                placeholder="Wybierz kierunek"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="studyYear"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Rok studiów</FieldLabel>
              <Select
                value={
                  field.value === undefined || field.value === ""
                    ? emptySelectValue
                    : field.value
                }
                onValueChange={(value) => {
                  field.onChange(value === emptySelectValue ? "" : value);
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Wybierz rok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptySelectValue}>Brak</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {fullAccess ? (
          <>
            <Controller
              name="bio"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bio / komentarz</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="np. wiceprezes ds. technologii"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="hrNotes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Notatki HR</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Doświadczenie zawodowe, hackathony, rozmowy, preferencje..."
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Widoczne tylko dla zarządu.
                  </FieldDescription>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="sectionIds"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Sekcje</FieldLabel>
                  <MultiSelect
                    options={sections.map((section) => ({
                      value: section.id,
                      label: section.name,
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Wybierz sekcje"
                  />
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Role</FieldLabel>
              <div className="flex flex-col gap-2">
                {roleFields.fields.map((roleField, index) => (
                  <div key={roleField.id} className="flex gap-2">
                    <Controller
                      name={`roleAssignments.${index}`}
                      control={form.control}
                      render={({ field }) => (
                        <RolePickerFields
                          roleDefinitions={roleDefinitions}
                          sections={sections}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        roleFields.remove(index);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    roleFields.append({
                      roleDefinitionId: "",
                      startedAt: "",
                    });
                  }}
                >
                  <Plus /> Dodaj rolę
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel>Adresy e-mail</FieldLabel>
              <div className="flex flex-col gap-2">
                {emailFields.fields.map((emailField, index) => (
                  <div key={emailField.id} className="flex gap-2">
                    <Controller
                      name={`emails.${index}.email`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div className="flex-1">
                          <Input
                            {...field}
                            placeholder="adres@example.com"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </div>
                      )}
                    />
                    <Controller
                      name={`emails.${index}.kind`}
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="login">logowanie</SelectItem>
                            <SelectItem value="notification">
                              powiadomienia
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        emailFields.remove(index);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    emailFields.append({ email: "", kind: "notification" });
                  }}
                >
                  <Plus /> Dodaj adres e-mail
                </Button>
                {form.formState.errors.emails?.root === undefined ? null : (
                  <FieldError errors={[form.formState.errors.emails.root]} />
                )}
              </div>
            </Field>
          </>
        ) : null}

        {submitError === null ? null : (
          <FieldDescription className="text-destructive">
            {submitError}
          </FieldDescription>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Zapisz
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.back();
            }}
          >
            Anuluj
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
