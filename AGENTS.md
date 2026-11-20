<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Forms

Always use shadcn + react-hook-form + zod for every form — no exceptions. Reference: https://ui.shadcn.com/docs/forms/react-hook-form

Required pattern:

```tsx
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

const formSchema = z.object({
  title: z.string().min(5).max(32),
})

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { title: "" },
})

// In JSX:
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

Install before writing form code: `pnpm dlx shadcn@latest add field` and `pnpm add zod @hookform/resolvers react-hook-form`.

# Project structure

Route folders under `src/app/` (including route groups like `(app)`) hold only `page.tsx`/`layout.tsx` (and `page.client.tsx` for a segment that's practically 100% client-side) — no forms, dialogs, panels, schemas, or server actions living next to them.

- **`src/actions/`** — sibling to `src/app/`, not nested inside it. All server actions (`"use server"`), one file per domain (e.g. `members.ts`, `projects.ts`), not split per route.
- **`src/components/`** — every non-page component. Domain-specific components go in a subfolder named after the domain (e.g. `components/members/member-form.tsx`, `components/projects/team-panel.tsx`). Shared/generic ones (shadcn primitives, cross-domain widgets) sit flat in `components/` or `components/ui/`.
- **`src/lib/`** — framework-agnostic logic: permissions, integrations, and zod schemas under `lib/schemas/<domain>.ts`.

A page imports its form/action/schema via `@/components/...`, `@/actions/...`, `@/lib/schemas/...` — never relative imports across these folders.

# Verifying changes

`pnpm dev`, `pnpm build`, and manual/browser smoke tests are allowed when they're useful for verification, as long as you manage them yourself and clean up afterwards:

- Run long-lived processes (dev server, `pnpm start`, Docker containers) in the background, track what you started, and stop all of it before finishing. Never leave servers, watchers, browsers, or containers running, and never kill processes you didn't start.
- If the default port is taken, use another one rather than killing whatever holds it.
- Remove temporary files, screenshots, build artifacts outside the usual ignored paths, and test data you inserted into a shared/dev database. Prefer a disposable database for anything that writes data.
- Leave the working tree as you found it, apart from the intended changes.

Don't run `pnpm lint`/`pnpm types:check` after every individual change. Run the full set of checks at the end of the task (and at meaningful milestones in long tasks) to verify the complete set of changes.
