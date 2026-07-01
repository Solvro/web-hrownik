# HRownik — plan implementacji

Źródło wymagań: [FEATURES.md](./FEATURES.md). Ten dokument rozbija je na fazy, ze szczegółowym planem dla Fazy 1 (MVP) i backlogiem wysokopoziomowym dla reszty.

## Założenia i decyzje

- **Stack**: Next.js 16 (App Router — uwaga: ma breaking changes względem danych treningowych, przed pisaniem kodu sprawdzać `node_modules/next/dist/docs/`), TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM + Postgres (`docker-compose.yml`), better-auth, `@solvro/config`.
- **Formularze**: zawsze shadcn + react-hook-form + zod, zgodnie z `AGENTS.md` (`Field`/`FieldLabel`/`FieldError` + `Controller`).
- **Integracje** (GitHub, Discord, Solvro Auth/Keycloak) — dostępy są gotowe po stronie organizacji, ale plan zakłada **generyczne nazwy zmiennych środowiskowych** jako placeholdery do uzupełnienia w `.env` (patrz sekcja Konfiguracja).
- **Eventownik (import zgłoszeń rekrutacyjnych)** — świadomie odłożone na backlog, nie wchodzi w zakres MVP.
- **„Grupka"** (auto-dodawanie do grupy mailingowej w onboardingu) — cel nieokreślony, w MVP zostaje jako jawne TODO/no-op hook w pipeline onboardingu, bez konkretnej integracji.
- **USOS** — logowanie przez plugin [`better-auth-usos`](https://www.npmjs.com/package/better-auth-usos). Przed użyciem w Fazie 1 zweryfikować aktualne API pluginu (nazwy opcji, callbacki) w jego dokumentacji/README, bo nie sprawdzałem jego źródeł.
- Plan pisany pod model danych, który da się rozbudowywać — ale **bez budowania na zapas** rzeczy spoza Fazy 1 (np. tabel pod Eventownik czy ranking aktywności trafiają dopiero do Fazy 2/3, gdzie faktycznie są potrzebne).
- **Migracja z Excela/Google Sheets** — obecne dane źródłowe są w `data/*.tsv`. Appka ma przejąć rolę source of truth, więc pola statusu, notatek HR, danych uczelnianych i historii projektów muszą odpowiadać arkuszom bez utraty kluczowego kontekstu.
- **Logo aplikacji** — statyczne logo trzymamy w `src/app/icon.png`, zgodnie z Next.js App Router file convention dla app icons. Nie przenosić do `public/`.

**Struktura plików**: server actions w `src/actions/<domena>.ts` (siostrzany katalog `src/app/`), komponenty (formularze, dialogi, panele) w `src/components/<domena>/`, zod schematy w `src/lib/schemas/<domena>.ts`. Foldery tras pod `src/app/` zawierają tylko `page.tsx`/`layout.tsx`. Szczegóły w `AGENTS.md`.

---

## Faza 0 — Fundamenty ✅ zrobione

1. **Konfiguracja środowiska** — rozszerzyć `src/env.ts` o zmienne (placeholdery, bez realnych wartości):
   - `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_ORG` (dostęp do org Solvro: tworzenie repo, teamów, issues)
   - `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` (zaproszenia, role)
   - `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (Solvro Auth / self-hosted Keycloak)
   - `USOS_CONSUMER_KEY`, `USOS_CONSUMER_SECRET`, `USOS_BASE_URL` (better-auth-usos)
   - Zaktualizować `.env.example` (jeśli nie istnieje — utworzyć).
2. **Auth — rozszerzenie `src/lib/auth.ts`**:
   - dodać `genericOAuth`/OIDC plugin better-auth wskazujący na Solvro Auth (Keycloak),
   - dodać plugin `better-auth-usos` (po weryfikacji API),
   - zostawić `emailAndPassword` jako fallback do kont bootstrapowych zarządu (do potwierdzenia czy zostaje na stałe, czy tylko na czas wdrożenia).
3. **Struktura schematu DB** — rozbić `src/db/schema.ts` na katalog `src/db/schema/` z osobnymi plikami (`members.ts`, `sections.ts`, `roles.ts`, `projects.ts`, `github.ts`), `schema.ts` jako barrel re-eksportujący wszystko (zachowując `auth-schema.ts` bez zmian).
4. Dodać brakujące komponenty shadcn potrzebne w Fazie 1: `table`, `dialog`, `dropdown-menu`, `badge`, `tabs`, `avatar`, `command`, `popover`, `combobox` (multi-select sekcji/ról przez `command` + `popover` + `badge`, bo shadcn nie ma natywnego multi-selecta).

---

## Faza 1 — MVP (członkowie, role, projekty, uprawnienia) ✅ zrobione

### Model danych

```
member (src/db/schema/members.ts)
  id, user_id -> user.id (nullable, unique; powiązany dopiero po pierwszym logowaniu)
  full_name, github_username, discord_id, facebook_url
  student_index (nullable), study_department, study_field, study_year
  bio, hr_notes (widoczne tylko dla zarządu)
  status: enum('new','active','inactive','honorary')
  created_at, updated_at

member_email (src/db/schema/members.ts)
  id, member_id -> member.id
  email, kind: enum('login','notification')
  verified_at (nullable)

section (src/db/schema/sections.ts)
  id, name, description

member_section (src/db/schema/sections.ts)
  member_id, section_id, joined_at, left_at (nullable)

role_definition (src/db/schema/roles.ts)
  id, scope: enum('section','project','board')
  name (np. "przewodniczący", "prezes")
  permission_level: enum('board','project_lead','member')
  github_team_slug (nullable), discord_role_id (nullable)

role_assignment (src/db/schema/roles.ts)
  id, member_id -> member.id
  role_definition_id -> role_definition.id
  section_id (nullable, fk -> section.id), project_id (legacy/nullable, nieużywane dla nowych ról)
  -- nowe role projektowe nie są tu tworzone; są częścią team_member.role
  started_at, ended_at (nullable = aktualna rola)
  -- źródło timeline'u ról organizacyjnych i sekcyjnych na profilu

project (src/db/schema/projects.ts)
  id, name, slug, status: enum('active','completed','suspended')
  visibility: enum('internal','public')
  production_url (nullable)
  drive_folder_url (nullable)
  report_drive_url (nullable, uzupełniane przy zakończeniu)
  ended_at (nullable)
  created_at, updated_at

project_repository (src/db/schema/github.ts)
  id, project_id -> project.id
  github_repo_full_name, github_repo_id
  added_at

team (src/db/schema/projects.ts)
  id, project_id -> project.id
  name (frontend/backend/devops/...)
  github_team_slug (nullable), discord_role_id (nullable)

team_member (src/db/schema/projects.ts)
  team_id -> team.id, member_id -> member.id
  role (np. PM, PO, techlead, TS, programista, UI/UX designer, członek zespołu)
  joined_at, left_at (nullable)
```

Uwagi:

- Role zarządu i sekcji są w `role_assignment` + `role_definition`.
- Role projektowe są w `team_member.role`, razem z historią `joined_at`/`left_at`. To konsoliduje poprzedni duplikat: project-scoped `role_assignment` + osobne `team_member`.
- Uprawnienia zarządu wynikają z aktywnych ról board w `role_assignment`. Uprawnienia liderów projektów wynikają z aktywnego `team_member` z rolą leadową (`PM`, `PO`, `techlead`, `TS`).
- Dane ToPWR (`TOPWR_API_BASE_URL`) są pobierane server-side i cache'owane przez Next `fetch(..., { next: { revalidate: 86400 } })`.

### Uprawnienia (autoryzacja)

- Funkcja pomocnicza `getMemberPermissions(userId)` (`src/lib/permissions.ts`):
  - zwraca `{ isBoard: boolean, leadProjectIds: string[], memberId: string }`.
  - `isBoard` pochodzi z aktywnych ról board w `role_assignment`.
  - `leadProjectIds` pochodzi z aktywnych członkostw `team_member` (`left_at IS NULL`) z rolą leadową.
  - używana w server actions / route handlers do bramkowania zapisu (board → wszystko, project_lead → tylko swoje projekty/zespoły, member → tylko własny rekord `member` i tylko pola sociali + dane studiów).
- Middleware/`auth()` helper sprawdzający sesję better-auth i mapujący `user.id` → `member` (po `member.user_id`, a przy braku powiązania — po dopasowaniu e-maila/indeksu przy pierwszym logowaniu).

### Strony / trasy (App Router)

- `/login` — logowanie (Solvro Auth OIDC + USOS; email/password jako fallback do potwierdzenia).
- `/members` — lista członków z polskim statusem (`nowy`, `aktywny`, `nieaktywny`, `honorowy`).
- `/members/new` — formularz onboardingu (RHF+zod+shadcn), dostępny dla zarządu.
- `/members/[id]` — profil: dane, GitHub activity, osobny timeline projektów (`team_member`) oraz historia ról organizacyjnych/sekcyjnych (`role_assignment`). Notatki HR są widoczne tylko dla zarządu.
- `/members/[id]/edit` — edycja: pełna dla zarządu, ograniczona (sociale + dane studiów) dla właściciela profilu. Notatki HR i status są board-only.
- `/sections`, `/sections/[id]` — lista i widok sekcji z członkami.
- `/projects`, `/projects/[id]` — lista i widok projektu: atrybuty, repozytoria, aktywność, ranking, zespoły, członkowie zespołów i ich role projektowe.
- `/projects/new` — utworzenie projektu z wyborem istniejących repozytoriów (lista z GitHub API danej organizacji).
- `/projects/[id]/repos/[repoId]` — placeholder na podgląd issues/PR (pełna integracja w Fazie 2), na razie link do repo na GitHubie.

### Automatyzacje onboardingu (Faza 1, zakres ograniczony)

Po zapisaniu nowego członka:

1. Zaproszenie do GitHub org (GitHub API, wymaga `GITHUB_APP_ID`/PAT z uprawnieniem `members:write`).
2. Nadanie roli/zaproszenie na Discordzie (Discord API, wymaga bota na serwerze z uprawnieniem `Manage Roles`/`Create Instant Invite`).
3. **TODO jawne, no-op**: dodanie do „grupki" — zostawić wywołanie funkcji `inviteToGroup(member)` w `src/lib/onboarding.ts` jako pusty stub z komentarzem, do podpięcia gdy ustalony zostanie cel integracji.

Sync zespołów (zmiana składu `team_member`):

- przy dodaniu członka do zespołu → nadanie GitHub team membership + roli Discord zespołu,
- przy zakończeniu członkostwa (`left_at`) → odwrotnie (revoke), ale historia zostaje w bazie.
- Zaimplementować jako funkcje w `src/lib/integrations/github.ts` i `discord.ts`, wywoływane z server actions zarządzających `team_member`.

### Zakres celowo wyłączony z Fazy 1 (mimo że opisany w FEATURES.md)

- Import zgłoszeń z Eventownika (rekrutacja) — brak integracji, na razie ręczne tworzenie członków.
- Generowanie nowych repozytoriów z szablonów tech-stacków.
- GitHub activity timeline (per profil i per projekt) + ranking top-5 kontrybutorów.
- Pełny podgląd issues/PR repozytorium w HRowniku + prefillowane akcje tworzenia issue.
- Workflow zakończenia projektu (auto-task w GitHub „KN Solvro" + 4-krokowy checklist sprawozdania).
- Integracja „grupki".

---

## Faza 2 — GitHub: aktywność, repozytoria, ranking ✅ zrobione

Ostatecznie **webhooki zamiast pollingu w cronie** (zmiana względem pierwszej wersji tego planu):

- Tabela `github_activity_event` (`project_repository_id`, `project_id` zdenormalizowane, `member_id` nullable, `github_login`, `type`: commit/pull_request/issue, `external_id` do dedupe, `occurred_at`, `url`), unique na `(project_repository_id, type, external_id)`.
- `POST /api/webhooks/github` — odbiornik zdarzeń GitHub App (`push`, `pull_request` action=opened, `issues` action=opened), weryfikacja podpisu HMAC SHA-256 (`GITHUB_WEBHOOK_SECRET`, ta sama wartość co "Webhook secret" w ustawieniach apki). To główne, bieżące źródło danych.
- REST-owy backfill (`src/lib/integrations/github-activity.ts: syncRepositories`) — nie jako cron, tylko: (a) automatycznie raz przy podpięciu repo do projektu (`createProject`, uruchamiane w tle przez `after()` żeby nie blokować redirecta), (b) na żądanie przez przycisk „Synchronizuj aktywność" na stronie projektu (zarząd/liderzy) — pokrywa initial data collection i ręczne doganianie historii.
- Filtrowanie botów: `isBotLogin` — login kończący się na `[bot]`.
- Timeline na profilu członka (segmentowany per projekt) i timeline zagregowany na stronie projektu.
- Ranking top 5 kontrybutorów (tydzień/miesiąc) per projekt — `getContributorRanking`, agregacja po `github_activity_event`.
- Podgląd issues/PR na stronie repozytorium (live z GitHub API, nie cache'owane) + `AssignIssuePicker` — wybór członka z listy → link `github.com/.../issues/new?assignees=...`.

## Faza 3 — Szablony projektów i generowanie repo

- Wybór tech-stacku przy `/projects/new` → tworzenie repo w organizacji Solvro z template repo (GitHub API `generateRepository` z template), wstępnie skonfigurowanego `@solvro/config`.
- Wymaga katalogu znanych template-repo per stack (do ustalenia z zarządem, jakie stacki/szablony istnieją).

## Faza 4 — Zakończenie projektu

- Po zmianie statusu projektu na `completed`: utworzenie issue w repo „KN Solvro" przypisanego do liderów projektu („wypełnij sprawozdanie projektu"), z checklistą 4 kroków śledzoną w HRowniku (`project.report_drive_url` + status checklisty).

## Faza 5 — Rekrutacja przez Eventownik

- Integracja API Eventownika (do ustalenia: dostępność/dokumentacja API) — import zgłoszeń jako kandydatury, konwersja zaakceptowanej kandydatury na onboarding członka.

---

## Otwarte pytania (do ustalenia przed odpowiednią fazą, nie blokują Fazy 1)

- Czy `emailAndPassword` w better-auth zostaje na stałe (np. dla kont serwisowych) czy docelowo tylko OIDC + USOS?
- Jaki jest faktyczny cel „grupki" w onboardingu?
- Jakie tech-stacki/template-repo mają być dostępne przy tworzeniu nowego projektu (Faza 3)?
- Dostępność i kształt API Eventownika (Faza 5).
