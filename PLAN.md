# HRownik — plan implementacji

Źródło wymagań: [FEATURES.md](./FEATURES.md). Ten dokument rozbija je na fazy, ze szczegółowym planem dla zrealizowanych fundamentów i backlogiem dla kolejnych modułów.

## Założenia i decyzje

- **Stack**: Next.js 16 (App Router — uwaga: ma breaking changes względem danych treningowych, przed pisaniem kodu sprawdzać `node_modules/next/dist/docs/`), TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM + Postgres (lokalnie z `compose.yaml` — Postgres 17 jak w CI), better-auth, `@solvro/config`, Vitest (`pnpm test`).
- **Formularze**: zawsze shadcn + react-hook-form + zod, zgodnie z `AGENTS.md` (`Field`/`FieldLabel`/`FieldError` + `Controller`).
- **Integracje** (GitHub, Discord, Solvro Auth/Keycloak) — dostępy są gotowe po stronie organizacji, ale plan zakłada **generyczne nazwy zmiennych środowiskowych** jako placeholdery do uzupełnienia w `.env` (patrz sekcja Konfiguracja).
- **Eventownik (import zgłoszeń rekrutacyjnych)** — poza MVP; zrealizowane w Fazie 4 jako import pliku XLSX eksportowanego z Eventownika (bez zmian po stronie Eventownika).
- **„Grupka"** (auto-dodawanie do grupy mailingowej w onboardingu) — cel nieokreślony, w MVP zostaje jako jawne TODO/no-op hook w pipeline onboardingu, bez konkretnej integracji.
- **USOS** — logowanie przez plugin [`better-auth-usos`](https://www.npmjs.com/package/better-auth-usos). Zintegrowane w Fazie 0 (`usosAuth` w `src/lib/auth.ts`).
- Plan pisany pod model danych, który da się rozbudowywać — ale **bez budowania na zapas** rzeczy spoza Fazy 1 (np. tabel pod Eventownik czy ranking aktywności trafiają dopiero do faz, w których faktycznie są potrzebne).
- **Migracja z Excela/Google Sheets** — obecne dane źródłowe są w `data/*.tsv`. Appka ma przejąć rolę source of truth, więc pola statusu, notatek HR, danych uczelnianych i historii projektów muszą odpowiadać arkuszom bez utraty kluczowego kontekstu.
- **Zastępowanie małych arkuszy** — kolejne moduły, szczególnie finanse i planowanie budżetu, mają przenosić dane z rozproszonych Exceli/Google Sheets do modelu danych HRownika, z kontrolą uprawnień i historią zmian.
- **Logo aplikacji** — statyczne logo trzymamy w `src/app/icon.png`, zgodnie z Next.js App Router file convention dla app icons. Nie przenosić do `public/`.

**Struktura plików**: server actions w `src/actions/<domena>.ts` (siostrzany katalog `src/app/`), komponenty (formularze, dialogi, panele) w `src/components/<domena>/`, zod schematy w `src/lib/schemas/<domena>.ts`. Foldery tras pod `src/app/` zawierają tylko `page.tsx`/`layout.tsx`. Szczegóły w `AGENTS.md`.

---

## Faza 0 — Fundamenty ✅ zrobione

1. **Konfiguracja środowiska** — `src/env.ts` (`@t3-oss/env-nextjs`, `emptyStringAsUndefined: true`, więc puste `KEY=` = brak integracji), wzór w `.env.example`:
   - `DATABASE_URL`; `ADMIN_EMAIL`, `ADMIN_PASSWORD` (konto bootstrapowe tworzone przez seed),
   - `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (Solvro Auth / Keycloak),
   - `USOS_BASE_URL`, `USOS_CONSUMER_KEY`, `USOS_CONSUMER_SECRET`, `USOS_EMAIL_DOMAIN` (better-auth-usos),
   - `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_ORG`, `GITHUB_WEBHOOK_SECRET` (GitHub App),
   - `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_INVITE_CHANNEL_ID`,
   - `TOPWR_API_BASE_URL` (domyślnie `https://api.topwr.solvro.pl`), `NEXT_PUBLIC_APP_URL`.
   - Każda integracja jest opcjonalna i ma strażnika `is*Configured()` (`isGithubConfigured`, `isDiscordConfigured`) — bez konfiguracji jest no-op.
2. **Auth — `src/lib/auth.ts`** (better-auth, eksport `auth`; klient `authClient` w `src/lib/auth-client.ts`):
   - `genericOAuth` z helperem `keycloak` → Solvro Auth, rejestrowany tylko gdy ustawione są wszystkie trzy zmienne `OIDC_*`,
   - `usosAuth` z `better-auth-usos` (`userFields`: `studentNumber`, `usosId`, imię/nazwisko z profilu USOS),
   - `emailAndPassword` jako fallback dla konta bootstrapowego.
3. **Schemat DB** — katalog `src/db/schema/` (`members.ts`, `sections.ts`, `roles.ts`, `boards.ts`, `projects.ts`, `github.ts`, `api-keys.ts`, `enums.ts`, `relations.ts`, `columns.helpers.ts`), `src/db/schema.ts` jako barrel, `src/db/auth-schema.ts` (tabele better-auth) bez zmian. Migracje Drizzle w `drizzle/`.
4. **Seed** — `pnpm db:seed` (`src/db/seed.ts`): domyślne definicje ról (sekcja: przewodniczący/wiceprzewodniczący/członek; zarząd: prezes/wiceprezes/sekretarz; zespół projektu: Project Manager/Tech Lead/programista/UI/UX designer/członek zespołu; projekt: Product Owner), grupy uprawnień („Zarząd", „Liderzy projektów", „Właściciele projektów"), kadencja „Aktualna kadencja" ustawiona jako aktywna, konto administratora z `ADMIN_EMAIL`/`ADMIN_PASSWORD` (`seedAdminUser`).
5. **Komponenty shadcn** w `src/components/ui/` (m.in. `table`, `dialog`, `dropdown-menu`, `badge`, `tabs`, `avatar`, `command`, `popover`, `combobox`, `field`, `select`, `sheet`, `sidebar`, `chart`) + własny `src/components/multi-select.tsx` (`command` + `popover` + `badge`, bo shadcn nie ma natywnego multi-selecta).

---

## Faza 1 — MVP (członkowie, role, projekty, uprawnienia) ✅ zrobione

### Model danych

```
member (src/db/schema/members.ts)
  id, user_id -> user.id (nullable, unique; powiązany przy pierwszym logowaniu)
  parent_id -> member.id (nullable; „rodzic" — osoba wprowadzająca do koła)
  full_name, github_username, discord_id
  facebook_url, linkedin_url, instagram_url, website_url, photo_url
  student_index, study_department, study_field, study_year
  bio
  status: enum member_status('new','active','inactive','honorary'), domyślnie 'active'
  created_at, updated_at

member_hr_note (src/db/schema/members.ts)
  member_id (PK) -> member.id (cascade)
  content, updated_at
  -- notatki HR poza tabelą member, żeby żaden generyczny odczyt (np. `include` w publicznym API) ich nie zwrócił;
  -- zapis przez setMemberHrNote / appendMemberHrNote (src/lib/member-hr-notes.ts)

member_email (src/db/schema/members.ts)
  id, member_id -> member.id (cascade)
  email (unique), kind: enum email_kind('login','notification')
  verified_at (nullable)

section (src/db/schema/sections.ts)
  id, name (unique), description

member_section (src/db/schema/sections.ts)
  -- legacy: tabela i relacje istnieją, ale członkostwo w sekcji jest
  -- zapisywane jako role_assignment ze scope 'section' (rola „członek")

role_definition (src/db/schema/roles.ts)
  id, scope: enum role_scope('section','project_team','project','board')
  name (unique per scope), github_team_slug (nullable), discord_role_id (nullable)

role_assignment (src/db/schema/roles.ts)
  id, member_id -> member.id
  role_definition_id -> role_definition.id (restrict)
  board_term_id | section_id | project_id (najwyżej jedno — CHECK num_nonnulls <= 1;
    zgodność ze scope definicji pilnowana w warstwie aplikacji)
  started_at, ended_at (nullable = aktualna rola)
  -- źródło timeline'u ról zarządowych i sekcyjnych; scope 'project' = rola właścicielska
  -- projektu (Product Owner) przypisana do project_id

project (src/db/schema/projects.ts)
  id, name, slug (unique)
  status: enum('active','completed','suspended'), visibility: enum('internal','public')
  production_url, drive_folder_url, project_card_drive_url
  report_drive_url (zapisywane tylko przy statusie 'completed')
  started_at, ended_at
  leaderboard_limit (domyślnie 5), leaderboard_include_external, leaderboard_include_bots
  created_at, updated_at

team (src/db/schema/projects.ts)
  id, project_id -> project.id
  name, github_team_slug (nullable), discord_role_id (nullable)

team_member (src/db/schema/projects.ts)
  id, team_id -> team.id, member_id -> member.id
  role_definition_id -> role_definition.id (scope 'project_team', pilnowane w aplikacji)
  joined_at, left_at (nullable)
```

Uwagi:

- Role zarządu i sekcji są w `role_assignment` + `role_definition`; role zarządowe są przypięte do kadencji (`board_term_id`, patrz Faza 3).
- Role w zespołach projektowych to `team_member.role_definition_id` (definicje ze scope `project_team`), z historią `joined_at`/`left_at`.
- Uprawnienia nie są kodowane w rolach na sztywno — role dostają grupy uprawnień (Faza 3).
- Dane ToPWR pobiera `getUniversityInfoOptions()` (`src/lib/integrations/topwr.ts`) z `/api/v1/departments?fieldsOfStudy=true`, cache Next.js `revalidate: 86400`, tag `topwr-university-info`.

### Uprawnienia (autoryzacja) — `src/lib/permissions.ts`

- `getMemberPermissions(memberId)` (opakowane w React `cache`) zwraca `{ memberId, grants: Set<"resource:action">, leadProjectIds }`:
  - `grants` — z aktywnych `role_assignment` (bez `project_id`; role zarządowe tylko z aktywnej kadencji w `board_settings`) → `role_definition_permission_group` → `permission_grant`,
  - `leadProjectIds` — projekty, w których członek ma aktywny `team_member` z rolą mającą grant `project_team:lead`, oraz projekty z aktywną rolą scope `project` z tym grantem.
- `can(permissions, resource, action)`, `canManageProject(permissions, projectId)` (`projects:write` albo lider projektu), `canEditOwnProfile(permissions, memberId)`, `filterNavItems(permissions, items)` (nawigacja w `src/components/app-nav-items.ts` z `requiredGrant`).
- Server actions i strony bramkują zapis tymi funkcjami; właściciel profilu edytuje tylko sociale i dane studiów.
- Sesja → członek: `getSessionUser`, `getSessionAuthIdentity`, `getCurrentMember` (`src/lib/current-member.ts`) — najpierw `member.user_id`, potem dopasowanie po e-mailu z `member_email`, a dla USOS po numerze indeksu (`studentNumber` → `member.student_index`), po czym `user_id` zostaje zapisany.

### Strony / trasy (App Router)

- `/login` — Solvro Auth (OIDC), USOS, e-mail/hasło.
- `/` — strona startowa z kafelkami nawigacji filtrowanymi przez `filterNavItems`.
- `/members` — lista członków (filtry, polskie statusy).
- `/members/new` — formularz onboardingu (`member-form.tsx`, RHF + zod + shadcn), z checkboxami wysyłki zaproszeń GitHub/Discord.
- `/members/import` — import przyjętych z rekrutacji (Faza 4); `/members/import/legacy` — import historycznego arkusza CSV/TSV (patrz niżej).
- `/members/[id]` — profil: dane, aktywność GitHub, timeline projektów (`team_member`), historia ról (`role_assignment`), notatki HR tylko dla zarządu.
- `/members/[id]/edit` — edycja: pełna dla `members:write`, ograniczona dla właściciela profilu.
- `/members/[id]/activity` — aktywność GitHub członka.
- `/sections`, `/sections/[id]`, `/sections/[id]/edit`.
- `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`, `/projects/[id]/activity`, `/projects/[id]/repos/[repoId]`.
- `/api/members/github-validation` — sprawdzanie istnienia loginu GitHub w formularzu (`getGithubUserProfile`).

Server actions (`src/actions/`):

- `members.ts`: `createMember`, `updateMember`, `deleteMember`, `previewLegacyMemberImport`, `commitLegacyMemberImport`, `analyzeRecruitmentImport`, `commitRecruitmentImport` (Faza 4),
- `sections.ts`: `createSection`, `updateSection`, `deleteSection`,
- `roles.ts`: `assignRole`, `endRoleAssignment`, `createRoleDefinition`, `updateRoleDefinition`, `deleteRoleDefinition`,
- `projects.ts`: `createProject`, `updateProject`, `deleteProject`, `createTeam`, `updateTeamName`, `deleteTeam`, `addTeamMember`, `assignProjectMemberToTeam`, `updateTeamMemberDetails`, `removeTeamMember`, `updateTeamRepositories`, `assignRepoToTeam`, `syncProjectActivity`, `addProjectStatusEntry`, `deleteProjectStatusEntry`,
- `auth.ts`: `signOutAction`.

### Import członków z arkusza (migracja, od Fazy 4 jako legacy)

- `/members/import/legacy` → `legacy-member-import-form.tsx`: wybór typu arkusza (`active`/`new`/`inactive`/`honorary` — status wynika z zakładki) + plik CSV/TSV (`parseDelimitedText`, `src/lib/csv.ts`, separator wykrywany automatycznie).
- `parseMemberImportFile` (`src/lib/member-import/legacy.ts`) mapuje stałe nagłówki historycznego arkusza (`Imię`, `Nazwisko`, `Index`, `Mail`, `Github`, `Messenger`, …) i zbiera resztę kolumn jako linie notatek HR.
- `previewLegacyMemberImport` zwraca edytowalny podgląd (duplikaty po indeksie/e-mailu, podpowiedź rodzica po nazwisku), `commitLegacyMemberImport` tworzy członków (przez `createMemberRecord`), brakujące sekcje (tworzone automatycznie) i role „członek sekcji"; **nie wysyła** zaproszeń. Logika w `previewLegacyImport` / `commitLegacyImport` (`src/lib/member-import/legacy.ts`).

### Automatyzacje onboardingu — `src/lib/onboarding.ts`

`runOnboardingAutomations({ member, sendGithubInvite, sendDiscordInvite })` wołane z `createMember` (i z importu rekrutacji, Faza 4) po zapisaniu członka; każdy krok fail-soft (ostrzeżenie w logu, rekord członka zostaje):

1. Zaproszenie do organizacji GitHub — `inviteMemberToOrg(githubUsername)` (`src/lib/integrations/github.ts`, GitHub App przez `@octokit/auth-app`).
2. Link zaproszenia na Discorda — `createOnboardingInvite()` (`src/lib/integrations/discord.ts`, kanał `DISCORD_INVITE_CHANNEL_ID`); wynik pokazywany po utworzeniu członka. Role discordowe nie są nadawane przy onboardingu, tylko przez sync zespołów.
3. **No-op**: `addToMailingGroup()` — „grupka", do podpięcia po ustaleniu celu integracji.

Sync zespołów — `src/lib/team-sync.ts`:

- `grantTeamAccess` przy dodaniu do zespołu → `addMemberToTeam` (GitHub team `github_team_slug`) + `addGuildMemberRole` (rola `discord_role_id`, gdy członek ma `discord_id`),
- `revokeTeamAccess` przy zakończeniu członkostwa / usunięciu członka → `removeMemberFromTeam` + `removeGuildMemberRole`; historia w bazie zostaje.

---

## Faza 2 — GitHub: aktywność, repozytoria, ranking ✅ zrobione

Webhooki zamiast pollingu w cronie:

```
project_repository (src/db/schema/github.ts)
  id, project_id -> project.id, github_repo_full_name (unique), github_repo_id, added_at

team_repository (src/db/schema/github.ts)
  id, team_id -> team.id, project_repository_id -> project_repository.id (unique para)

github_activity_event (src/db/schema/github.ts)
  id, project_repository_id, project_id (zdenormalizowane), member_id (nullable)
  github_login, type: enum('commit','pull_request','issue')
  external_id (SHA / numer PR/issue), occurred_at, url, title (nullable)
  unique(project_repository_id, type, external_id)

github_external_contributor (src/db/schema/github.ts)
  id, github_login (unique), type, noted_at  -- tabela zdefiniowana, na razie nieużywana w kodzie
```

- `POST /api/v1/webhooks/github` — odbiornik GitHub App (`push`, `pull_request` opened, `issues` opened), weryfikacja HMAC SHA-256 (`GITHUB_WEBHOOK_SECRET`). Główne źródło danych.
- Backfill REST (`src/lib/integrations/github-activity.ts`): `syncRepositories` / `syncProjectRepositoryActivity`, uruchamiany **ręcznie** przyciskiem „Synchronizuj aktywność" na stronie projektu (`syncProjectActivity`, zarząd/liderzy). Automatyczny backfill przy podpięciu repo nie jest zaimplementowany.
- `reattributeActivityForMember(memberId, githubUsername)` — przypisuje wcześniejsze zdarzenia do członka po ustawieniu/zmianie loginu GitHub.
- Filtrowanie botów: `isBotLogin` (login kończący się na `[bot]`); tytuł zastępczy: `fallbackActivityTitle`.
- Heatmapa/timeline: `getMemberDailyActivity`, `getProjectDailyActivity` (zakresy dat w `src/lib/activity-range.ts`), komponenty `contribution-heatmap.tsx`, `activity-timeline.tsx`, `activity-trend-chart.tsx`.
- Ranking kontrybutorów per projekt — `getContributorRanking`, konfigurowalny per projekt (`leaderboard_limit`, `leaderboard_include_external`, `leaderboard_include_bots`).
- Wybór repozytoriów organizacji: `listOrgRepos` (cache, `clearOrgReposCache`); podpinanie: `linkRepoToProject`, `linkRepoToProjectAndTeam` (`src/actions/github.ts`), `updateTeamRepositories`, `assignRepoToTeam`.
- Strona repozytorium `/projects/[id]/repos/[repoId]` — otwarte issues/PR live z GitHub API (`listOpenIssuesAndPulls`) + `AssignIssuePicker` (link `github.com/.../issues/new?assignees=...`).

---

## Faza 3 — Kadencje, uprawnienia, publiczne API, panel GitHub ✅ zrobione

Rzeczy dodane po Fazie 2, nieujęte w pierwotnym planie.

### Kadencje zarządu (`/boards`)

```
board_term (src/db/schema/boards.ts)
  id, name (unique), starts_at, ends_at, description, created_at, updated_at

board_settings (src/db/schema/boards.ts)
  id = 'singleton' (CHECK), active_board_term_id -> board_term.id (set null)
```

- Role zarządowe w `role_assignment` są przypięte do kadencji (`board_term_id`); uprawnienia zarządu daje tylko aktywna kadencja z `board_settings`.
- Akcje `src/actions/boards.ts`: `createBoardTerm`, `updateBoardTerm`, `setActiveBoardTerm`; komponenty w `src/components/boards/`.
- Skrypt `pnpm import:board-terms` (`scripts/import-board-terms.ts`, `--dry-run`) — import historycznych zarządów z Directusa (`cms.solvro.pl`).

### Grupy uprawnień (`/settings/roles`)

```
permission_group (src/db/schema/roles.ts)            id, name (unique), description
permission_grant (src/db/schema/roles.ts)            id, permission_group_id, resource, action  (unique trójka)
role_definition_permission_group (src/db/schema/roles.ts)  role_definition_id, permission_group_id (unique para)
```

- Katalog grantów w kodzie — `src/lib/permissions/catalog.ts` (`PERMISSION_RESOURCES`, `PERMISSION_MATRIX_COLUMNS`, `grantKey`, `isValidGrant`): `members`, `boards`, `sections`, `projects`, `roles` (`read`/`write`) oraz `project_team:lead`. Kto ma które granty — tylko w bazie.
- Akcje `src/actions/permission-groups.ts`: `createPermissionGroup`, `updatePermissionGroup`, `deletePermissionGroup`, `setPermissionGrant`; UI: `roles-permissions-tabs.tsx`, `permission-matrix.tsx`, `permission-group-form.tsx`, `role-list.tsx`, `role-form.tsx` (`src/components/settings/`).

### Publiczne API tylko do odczytu (`/api/v1`, `/settings/api-keys`)

```
api_key (src/db/schema/api-keys.ts)
  id, name, key_hash (sha256, unique), key_prefix, created_by_member_id
  request_count, last_used_at, created_at

api_key_endpoint_stat (src/db/schema/api-keys.ts)
  id, api_key_id, resource, request_count, last_used_at  (unique para klucz/zasób)
```

- Klucze: `createApiKey`, `deleteApiKey` (`src/actions/api-keys.ts`), `generateApiKeySecret`, `hashApiKeySecret`, `getApiKeyDisplayPrefix` (`src/lib/api-keys.ts`); surowy klucz pokazywany tylko raz.
- Autoryzacja: `authenticateApiKey` (`src/lib/api/authenticate.ts`) — `Authorization: Bearer <klucz>`, zliczanie użyć per zasób.
- Endpointy (`GET`): `/api/v1/members[/id]`, `/api/v1/projects[/id]`, `/api/v1/sections[/id]`, `/api/v1/boards[/id]`, `/api/v1/boards/active` — przez `listReadOnly` / `getReadOnly` (`src/lib/api/read-only.ts`; paginacja `page`/`pageSize` lub `limit`/`offset`, relacje przez `include`) z konfiguracjami `memberApiConfig`, `projectApiConfig`, `sectionApiConfig`, `boardApiConfig` (`src/lib/api/resources.ts`). Prywatne pola członka (notatki HR itp.) nie są zwracane.

### Panel GitHub (`/settings/github`)

- Podsumowanie + podstrony: `/settings/github/repositories` (repozytoria organizacji bez projektu), `/settings/github/project-repos` (repozytoria projektów bez zespołu), `/settings/github/contributors` (kontrybutorzy spoza listy członków); komponenty w `src/components/github/`.

### Historia statusów projektu

- `project_status_history` (`projectStatus` w `src/db/schema/projects.ts`): id, project_id, status, created_at. `addProjectStatusEntry` dodaje wpis i zmienia `project.status` (przejście na `completed` ustawia `ended_at`, na `active` uzupełnia brakujące `started_at`); `deleteProjectStatusEntry` usuwa wpis.

### Migracje danych (skrypty)

- `pnpm import:directus-team` (`scripts/import-directus-team.ts`) — import członków (imię, opis, zdjęcie, sociale) z Directusa.
- `pnpm update:section-join-date` (`scripts/update-section-join-date.ts`, `--dry-run`, `--apply-all-sections`) — korekta dat dołączenia do sekcji po migracji.

---

## Faza 4 — Rekrutacja przez Eventownik ✅ zrobione

Import przyjętych kandydatów z **pliku XLSX eksportowanego z Eventownika** (wydarzenie rekrutacyjne) jako nowych członków — **główna ścieżka importu**. Dotychczasowy import historycznego arkusza CSV/TSV został jako legacy. Bez zmian po stronie Eventownika; bezpośrednie API to przyszłe rozszerzenie (4.2).

### Format źródłowy (eksport Eventownika v3)

- Backend `backend-eventownik-v3` (NestJS), eksport `GET /api/v3/events/:id/import-export/participants?format=xlsx`: jeden arkusz — `participantUuid`, `email`, potem **nazwy atrybutów formularza** w kolejności z formularza. Nazwy kolumn to pytania z formularza i **zmieniają się między edycjami** (duplikaty nazw dostają sufiks ` (uuid)`); wartości wielokrotne są łączone `"; "`, bloki (np. „Termin rozmowy") eksportowane jako UUID.
- Bieżąca rekrutacja: `Imię`, `Nazwisko`, `Indeks`, `Kierunek`, `Wydział` (`W1`…`W14` / `Inny`), `Rok i stopień` (`1 rok, I stopień`), 2 pytania otwarte, `Link do GitHub albo portfolio`, `Zadanie rekrutacyjne`, `Termin rozmowy`, `Wolne myśli`, `Facebook`, `GitHub`, `Discord`, `Sekcje`, `Wstępny wybór sekcji`, `Sekcja na rozmowę`, `Sekcja ostateczna`. Przyjęci = wiersze z niepustą `Sekcja ostateczna`.

### Model danych

```
member_recruitment (src/db/schema/recruitment.ts, migracja 0021_add_member_recruitment)
  id, member_id -> member.id (cascade)
  source: enum recruitment_source('eventownik')
  external_participant_id (participantUuid; null, gdy plik nie ma tej kolumny)
  edition (np. "Rekrutacja 2026Z")
  imported_at, imported_by_member_id -> member.id (set null)
  unique(source, external_participant_id)
```

Deduplikacja, „skąd przyszedł" (na profilu — później) i klucz przyszłej synchronizacji przez API. Zaimportowani członkowie dostają status `new`.

### Przepływ (`/members/import`, `src/components/members/import/`)

1. **Plik** (`import-upload-step.tsx`, RHF + zod `recruitmentUploadSchema`) — `.xlsx` albo `.csv` (≤ 5 MB), etykieta edycji, data dołączenia (domyślnie dziś w strefie Europe/Warsaw). Plik idzie w `FormData` do `analyzeRecruitmentImport`; parsowanie na serwerze (`readImportTable`, `src/lib/member-import/file.ts`: `read-excel-file/node`, liczby jako tekst, pierwszy arkusz). `experimental.serverActions.bodySizeLimit = "6mb"` w `next.config.ts` (limit pliku 5 MB + narzut multipart).
2. **Mapowanie kolumn** (`column-mapping-step.tsx`, `columnMappingFormSchema`) — pole HRownika → kolumna z pliku / „nie importuj", wstępnie wypełnione wykrytym mapowaniem z poziomem pewności. Wymagane: imię i nazwisko (dwie kolumny albo jedna) oraz e-mail; jedna kolumna może zasilać tylko jedno pole. Zmiana mapowania wysyła plik ponownie z nadpisanym mapowaniem (bezstanowo — plik zostaje w przeglądarce).
3. **Podgląd i korekta** (`import-preview-table.tsx`, `useFieldArray` + `recruitmentImportRowSchema`) — domyślnie tylko przyjęci, przełącznik „Pokaż wszystkich zgłoszonych". Per wiersz: „importuj", imię i nazwisko, e-mail + rodzaj, indeks, GitHub, Discord, Facebook, wydział (select z ToPWR), kierunek (combobox filtrowany po wydziale i stopniu), rok (`studyYearOptions`), sekcje (`MultiSelect` z istniejących sekcji), uwagi (ostrzeżenia z surową wartością, powód duplikatu). Walidacja dotyczy tylko zaznaczonych wierszy i blokuje zatwierdzenie (z listą numerów wierszy).
4. **Podsumowanie** (`import-summary.tsx`) — per wiersz: dodano (link do profilu) / pominięto duplikat / błąd.

`recruitment-import-wizard.tsx` prowadzi kroki. Na `/members/import` jest dyskretny link „Import starego arkusza (legacy)".

### Wykrywanie kolumn (`src/lib/member-import/columns.ts`)

- `normalizeHeader`: bez sufiksu ` (uuid)`, potem `normalizeForMatching` (lowercase, bez diakrytyków — NFD + `ł→l`, znaki nie-alfanumeryczne → spacja).
- `detectColumns`: każde pole ma reguły `{ pattern, score }` + wykluczenia (tabela poniżej); wynik kolumny = najlepsza reguła + 10 za dopasowanie całego nagłówka + 20, gdy ≥ 80% niepustych wartości ma oczekiwany kształt (`@`, `^\d{6}$`, UUID, `github.com`, `facebook.com`), a dla e-maila/indeksu/UUID −50, gdy pasuje < 20%. Przypisanie zachłanne od najwyższego wyniku (remis → kolumna bardziej na lewo), minimum 50; pewność: ≥ 100 wysoka, ≥ 75 średnia, niżej niska.

  | Pole              | Reguły (priorytet malejąco)                                 | Wykluczenia           |
  | ----------------- | ----------------------------------------------------------- | --------------------- |
  | `firstName`       | `^imie$`, `first ?name`                                     | `nazwisko`            |
  | `lastName`        | `^nazwisko$`, `last ?name`, `surname`                       |                       |
  | `fullName`        | `imie i nazwisko`, `full ?name`                             |                       |
  | `email`           | `^e ?mail$`, `e ?mail`                                      |                       |
  | `externalId`      | `participant ?uuid`, `^uuid$`                               |                       |
  | `studentIndex`    | `^(nr )?indeks`, `indeks`, `index`, `album`                 |                       |
  | `studyDepartment` | `wydzial`, `faculty`                                        |                       |
  | `studyField`      | `kierunek`, `field of study`                                |                       |
  | `studyYear`       | `rok i stopien`, `^rok`, `stopien`                          | `rozmow`              |
  | `githubUsername`  | `^github$`, `github`                                        | `portfolio`           |
  | `githubPortfolio` | `portfolio` (GitHub tylko z linku do github.com)            |                       |
  | `discordId`       | `discord`                                                   |                       |
  | `facebookUrl`     | `facebook`, `^fb$`, `messenger`                             |                       |
  | `sections`        | `sekcja ostateczn`, `sekcj.* (przyjet\|final)`, `^sekcje?$` | `wstepn`, `na rozmow` |

- **Nic poza tymi polami nie trafia do bazy** — odpowiedzi otwarte, zadanie, termin rozmowy, wolne myśli i wstępne sekcje nie mają pola docelowego, więc nie da się ich zaimportować nawet ręcznym mapowaniem; notatki HR nie są wypełniane z pliku.
- Na prawdziwym eksporcie (122 zgłoszenia, 21 kolumn) wszystkie 13 pól jest wykrywanych z wysoką pewnością, a liczba przyjętych (46) zgadza się z niepustą `Sekcja ostateczna`.

### Normalizacja i dopasowanie (`normalize.ts`, `matching.ts` — czyste funkcje)

- E-mail: lowercase + walidacja zod; `@student.pwr.edu.pl` / `@pwr.edu.pl` → `login`, inne → `notification`.
- Indeks: tylko `^\d{6}$`, inaczej puste + ostrzeżenie.
- GitHub: username z linku `github.com/…` albo goły login (`@` zdejmowane); fallback na kolumnę portfolio tylko dla linku do github.com. `extractGithubUsername` jest wspólny z legacy.
- Discord: `discord(app).com/users/<id>` → `<id>`; inne linki (np. zaproszenia `discord.gg`) → puste + ostrzeżenie; poza tym nazwa bez `@`.
- Facebook: pierwszy link `http(s)://` z odpowiedzi, inaczej puste + ostrzeżenie.
- Rok: `(\d)\s*rok…(I{1,2})\s*stopie` → `I…IV inżynierski` / `I–II magisterski`, „doktor…" → `doktorat`; reszta → puste + ostrzeżenie.
- Listy: split na `;` i `,`, nigdy na `/` (`AI/ML`, `UI/UX Design`).
- Wydział: kod `W1`…`W14` → `department.value` z ToPWR (pełna nazwa jak w formularzu członka; `getUniversityInfoOptions` zwraca teraz `code` wydziału i `name` kierunku); `Inny` → puste bez ostrzeżenia.
- Kierunek: w obrębie wydziału i stopnia (z roku): równość znormalizowanych nazw (bez nawiasów, warianty „w języku angielskim / po angielsku / w j. ang." ujednolicone), potem jedyny najbardziej podobny kandydat z podobieństwem `1 − odległość Levenshteina / dłuższa długość` ≥ 0,85. Skróty („IST") i niejednoznaczne → puste + ostrzeżenie.
- Sekcje: tylko **istniejące** sekcje, po znormalizowanej nazwie bez spacji + grupy aliasów (`AI/ML`↔`AI`/`ML`, `Project Management`↔`PM`, `UI/UX Design`↔`UI/UX`, `Promotion`↔`Promocja`/`Marketing`); niedopasowane → ostrzeżenie. **Import nigdy nie tworzy sekcji.**

### Duplikaty

- Wiersz jest duplikatem, gdy istnieje członek z tym samym `external_participant_id` (Eventownik), e-mailem z `member_email`, indeksem albo loginem GitHub (bez rozróżniania wielkości liter), albo gdy ta sama osoba jest wcześniej w pliku jako przyjęta. Duplikat ma `include = false`, powód w uwagach i nie da się go zaznaczyć; przy zatwierdzeniu duplikaty są sprawdzane ponownie i pomijane — nikt nie jest nadpisywany, ponowne wgranie eksportu jest bezpieczne.

### Zatwierdzenie i automatyzacje

- `createMemberRecord(tx, input)` (`src/lib/members/create-member.ts`) — jedyna ścieżka tworzenia członka (`createMember`, import rekrutacji, import legacy): `member`, notatka HR, `member_email`, role, `reattributeActivityForMember`; `getSectionMemberRole` obok.
- `commitRecruitmentRows` tworzy każdy wiersz w osobnej transakcji (członek + `member_email` + rola „członek" sekcji od daty dołączenia + `member_recruitment`); błąd wiersza nie cofa pozostałych, wynik per wiersz (`created` / `skipped_duplicate` / `error`).
- Wiersz ma `onboarding: { githubInvite, discordInvite }` (domyślnie `false`, UI ich jeszcze nie pokazuje); po utworzeniu członka wołane jest `runOnboardingAutomations` z tymi flagami, a jego wynik jest w wyniku wiersza. Włączenie auto-zaproszeń = dwie kolumny checkboxów w podglądzie; docelowo (Fazy 5–7) zgoda na sugerowane akcje dostępów.

### Akcje i uprawnienia

- `src/actions/members.ts`: `analyzeRecruitmentImport(formData)` i `commitRecruitmentImport(input)` — cienkie wrappery (sesja → członek, ToPWR) nad `analyzeRecruitmentFile` / `commitRecruitmentRows` (`src/lib/member-import/recruitment.ts`), które same autoryzują (`assertCan(…, "members", "write", …)`, `src/lib/permissions.ts`) i walidują wejście zodem. Oczekiwane błędy (zły plik, brak wierszy, złe mapowanie, nieprawidłowe dane) wracają jako `{ ok: false, error }` (komunikaty z wyjątków są w produkcji ukrywane), brak uprawnień rzuca wyjątek.
- Legacy: `previewLegacyMemberImport` / `commitLegacyMemberImport` nad `previewLegacyImport` / `commitLegacyImport`; strona `/members/import/legacy` z ostrzeżeniem „Import historycznego arkusza członków — tylko do migracji danych".

### Testy i środowisko lokalne

- `compose.yaml` — Postgres 17 (jak w CI), healthcheck, port hosta `POSTGRES_PORT` (domyślnie 5432); opis w README.
- Vitest (`vitest.config.ts`, `pnpm test`): `tests/unit` (tabele wejście → wynik dla wykrywania kolumn, normalizacji i dopasowań ToPWR/sekcji) i `tests/integration` (prawdziwy Postgres: syntetyczny XLSX → analiza → zatwierdzenie → stan bazy; ponowny import, błąd wiersza, ręczne mapowanie, złe pliki, uprawnienia, regresja legacy). Testy integracyjne tworzą na serwerze z `TEST_DATABASE_URL` jednorazową bazę (migracje + seed) i usuwają ją po przebiegu; w CI krok „Run tests" na istniejącym serwisie Postgres.
- Syntetyczny eksport (`tests/fixtures/eventownik-export.ts`) ma układ kolumn prawdziwego eksportu i zmyślone osoby; prawdziwe eksporty trzymamy wyłącznie w ignorowanym `data/member-imports/`.

### 4.2 — przyszłość: bezpośrednie API Eventownika

- Wymaga zmian w Eventowniku (klucze API / webhooki — dziś jest tylko login admina → JWT 60 min z rotującym refresh tokenem). Po ich wprowadzeniu: wybór wydarzenia w ustawieniach + synchronizacja uczestników zamiast uploadu pliku. Wiersze podglądu, normalizacja, mapowanie sekcji/ToPWR, deduplikacja (`member_recruitment.external_participant_id`) i commit zostają bez zmian — zmienia się tylko źródło tabeli (atrybuty z API zamiast nagłówków XLSX).

## Wspólny fundament faz 5–7: dostępy, inwentarz kont i rozbieżności

Fazy 5–7 (Discord, GitHub, Dysk Google) realizują issue [#11](https://github.com/Solvro/web-hrownik/issues/11) „synchronizacja z Discordem, GitHubem i Google Drive" na jednym wspólnym mechanizmie, budowanym razem z Fazą 5 i reużywanym w 6 i 7.

### Zasady (z issue #11)

- **Baza HRownika jest źródłem prawdy** o tym, kto powinien mieć jaki dostęp. Z danych członka (status, sekcje, role, zespoły, projekty) liczony jest **stan oczekiwany**, a ze skanu platform — **stan faktyczny**.
- **Nic nie jest korygowane automatycznie.** Każda różnica to **rozbieżność** z opisem stanu oczekiwanego i faktycznego oraz z **sugerowanymi akcjami** do kliknięcia. Wybór zawsze należy do użytkownika.
- Dotyczy to też zdarzeń cyklu życia członka (utworzenie, zmiana statusu, zmiana ról/zespołów): po zmianie HRownik od razu pokazuje wynikające z niej sugerowane akcje, ale ich nie wykonuje sam.
- **Wyjątek: usunięcie członka.** Po usunięciu nie byłoby już rekordu, z którego da się policzyć stan, więc odebranie dostępów jest wykonywane **razem z usunięciem**, w tym samym potwierdzeniu (patrz niżej).
- **Inwentarz kont spoza HRownika**: skan każdej platformy zbiera wszystkie konta (członkowie serwera Discord, członkowie i zaproszenia organizacji GitHub, członkowie zespołów, uprawnienia na dysku), a konta niepowiązane z żadnym członkiem są osobną kategorią rozbieżności.

### Stan obecny (punkt wyjścia)

- `team.github_team_slug` / `team.discord_role_id` i `role_definition.github_team_slug` / `role_definition.discord_role_id` to wolny tekst; pola ról da się wpisać w `role-form.tsx`, pól zespołu nie da się ustawić z UI.
- Automatycznie synchronizują się tylko zespoły (`grantTeamAccess` / `revokeTeamAccess` z akcji w `projects.ts` i z `deleteMember`) — to zachowanie zostaje zastąpione sugerowanymi akcjami, zgodnie z zasadą „nic automatycznie".
- `member.discord_id` to wolny tekst (najczęściej username), a API Discorda wymaga numerycznego ID (snowflake).
- `github_external_contributor` — tabela zdefiniowana, nieużywana; zostaje wchłonięta przez inwentarz kont (`external_account`).
- Błędy integracji są tylko w `console.warn`.

### Model danych (`src/db/schema/access.ts`)

```
access_rule              -- „kto" → „co"
  id, provider: enum('discord','github','google_drive')
  subject_type: enum('member_status','section','role_definition','team','project')
  subject_id (nullable), statuses: member_status[] (dla subject_type = 'member_status')
  target_kind: enum('discord_guild','discord_role','github_org','github_team','drive')
  target_id, target_label (nazwa z cache)
  access_level (nullable) -- github_team: 'member'|'maintainer'; drive: 'reader'|'commenter'|'writer'|'fileOrganizer'|'organizer'
  created_at, created_by_member_id

external_account         -- inwentarz kont na platformach; konto z member_id = tożsamość członka
  id, provider: enum('discord','github','google')
  external_id     -- Discord snowflake / GitHub numeric user id / adres e-mail Google
  handle, display_name
  member_id (nullable, on delete set null)
  disposition: enum('linked','unmatched','ignored')
  link_source (nullable): enum('oauth','manual','matched') -- połączone przez członka / wpisane przez zarząd / dopasowane przez HRownika
  ignore_reason (nullable) -- np. „bot", „konto organizacyjne", „zewnętrzny kontrybutor"
  first_seen_at, last_seen_at
  unique(provider, external_id), unique(member_id, provider)

external_membership      -- migawka faktycznego stanu z ostatniego skanu
  id, external_account_id, target_kind, target_id
  state: enum('member','invited','invite_failed')
  access_level (nullable), external_ref (nullable) -- permissionId Dysku / id zaproszenia GitHub
  seen_at
  unique(external_account_id, target_kind, target_id)

access_exception         -- świadome odstępstwo („zostaw ten dostęp", „nie nadawaj")
  id, external_account_id lub member_id, target_kind, target_id
  kind: enum('keep','skip'), reason, created_by_member_id, created_at, expires_at (nullable)

access_scan
  id, provider, started_at, finished_at, error (nullable), stats (jsonb)

access_event             -- log wykonanych akcji (audyt)
  id, provider, action ('invite','add','remove','set_level','link','ignore',...)
  target_kind, target_id, external_account_id (nullable), member_id (nullable)
  subject_snapshot (jsonb — imię/nick/handle, żeby log był czytelny po usunięciu członka)
  result ('ok','error'), detail, triggered_by_member_id, created_at
```

- Migracja: niepuste `github_team_slug` / `discord_role_id` z `team` i `role_definition` → `access_rule`, potem usunięcie kolumn; `member.discord_id` / `member.github_username` → `external_account` (`disposition: 'linked'`, `link_source: 'matched'` po weryfikacji u dostawcy); `github_external_contributor` → `external_account` z `disposition: 'ignored'`, `ignore_reason: 'zewnętrzny kontrybutor'`.
- `member.github_username` zostaje jako pole profilu i do atrybucji aktywności (Faza 2); `member.discord_id` zostaje usunięte na rzecz `external_account`.

### Rozbieżności (`src/lib/access/discrepancies.ts`)

`getDiscrepancies({ provider?, memberId? })` porównuje stan oczekiwany (z `access_rule` + dane członka) z `external_membership` i zwraca listę typów:

| Typ                                | Przykład                                                            | Sugerowane akcje                                                                        |
| ---------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `missing_access`                   | aktywny członek nie jest w zespole GitHub „KN Solvro"               | „Dodaj", „Zostaw tak" (→ `access_exception` `skip`)                                     |
| `extra_access`                     | nieaktywny członek nadal w „KN Solvro" / na serwerze Discord        | „Usuń", „Zostaw" (→ `access_exception` `keep`)                                          |
| `level_mismatch`                   | lider projektu jest `member`, a nie `maintainer` zespołu            | „Zmień poziom"                                                                          |
| `missing_identity`                 | członek powinien być na Discordzie, ale nie ma powiązanego konta    | „Wyślij link zaproszenia", „Powiąż ręcznie", „Poproś o połączenie konta"                |
| `pending_invite` / `invite_failed` | zaproszenie do organizacji GitHub wygasło                           | „Wyślij ponownie", „Anuluj"                                                             |
| `unknown_account`                  | konto na serwerze / w organizacji / na dysku bez członka w HRowniku | „Powiąż z członkiem…", „Ignoruj (bot / konto organizacyjne / gość)", „Usuń z platformy" |

- Rozbieżności liczone są na żądanie z bazy (szybko, bez API); świeżość zależy od ostatniego skanu, pokazywanego obok („stan z 12 min temu", przycisk „Skanuj teraz").
- Akcje wykonuje `src/actions/access.ts` (`applyAccessActions(actions[])`) — po każdej akcji aktualizacja `external_membership` + wpis w `access_event`; błąd zostaje przy rozbieżności z treścią błędu.
- Zasada „nic automatycznie" obejmuje też konta nieznane: HRownik niczego nie usuwa sam z platform.

### Silnik (`src/lib/access/`)

- `expected.ts` — `getExpectedAccess(memberId)`: aktywne `role_assignment` (role zarządowe tylko z aktywnej kadencji, jak w `getMemberPermissions`), aktywne `team_member`, projekty zespołów, status → lista `{ targetKind, targetId, accessLevel, reasons[] }` (powody do UI, np. „status: aktywny", „sekcja Backend").
- `providers/{discord,github,google-drive}.ts` — wspólny interfejs `AccessProvider`: `isConfigured()`, `getHealth()` (uprawnienia bota/aplikacji/konta serwisowego), `listTargets(kind)` (do pickerów), `scan()` (pełny inwentarz → `external_account` + `external_membership`), `execute(action)`.
- `scan.ts` — `runAccessScan(provider)`; wywoływane przyciskiem „Skanuj teraz", po każdej wykonanej akcji (zakres jednej osoby) i okresowo przez `POST /api/v1/cron/access-scan` (`Authorization: Bearer ${CRON_SECRET}`, zewnętrzny scheduler — hosting cron albo GitHub Actions `schedule`). Skan tylko odświeża stan i raport — **nie wykonuje akcji**.
- Dopasowywanie nieznanych kont (`match.ts`): Discord po nazwie/nicku vs `full_name`, GitHub po loginie vs `member.github_username`, Google po e-mailu vs `member_email` → propozycje „Powiąż z X?" w rozbieżności `unknown_account`.

### Usuwanie członka (`deleteMember`)

- Dialog „Usuń członka" ładuje z `external_membership` wszystkie faktyczne dostępy powiązanych kont i pokazuje je jako zaznaczone akcje: „usuń z organizacji GitHub", „usuń z serwera Discord", „usuń z dysku współdzielonego", „usuń z zespołów …" — każdą można odznaczyć.
- Akcja serwera najpierw wykonuje zaznaczone usunięcia (z `subject_snapshot` w `access_event`), potem usuwa członka. Jeśli któreś usunięcie się nie powiedzie, dialog pokazuje błąd i pyta, czy mimo to usunąć członka.
- Konta, z których nie usunięto dostępu, zostają w `external_account` z `member_id = null`, `disposition: 'unmatched'` — więc trafiają do rozbieżności `unknown_account`, zamiast zniknąć z pola widzenia.

### Cykl życia członka → sugerowane akcje

Domyślne reguły (seed), zgodne z tabelą z issue #11:

| Platforma   | utworzenie członka                                  | usunięcie członka                            | status → nieaktywny     | status → aktywny               | status → inny niż aktywny         |
| ----------- | --------------------------------------------------- | -------------------------------------------- | ----------------------- | ------------------------------ | --------------------------------- |
| GitHub      | dodanie do organizacji Solvro                       | usunięcie z organizacji (w dialogu usuwania) | usunięcie z organizacji | dodanie do zespołu „KN Solvro" | usunięcie z zespołu „KN Solvro"   |
| Discord     | zaproszenie na serwer                               | usunięcie z serwera (w dialogu usuwania)     | usunięcie z serwera     | —                              | honorowy: rola „Członek honorowy" |
| Dysk Google | dodanie konta studenckiego do dysku współdzielonego | usunięcie z dysku (w dialogu usuwania)       | usunięcie z dysku       | —                              | —                                 |

Odpowiadające reguły: `member_status ≠ inactive` → `github_org`, `discord_guild`, `drive` (dysk współdzielony koła); `member_status = active` → `github_team` „KN Solvro"; `member_status = honorary` → `discord_role` „Członek honorowy".

- Po każdej akcji zmieniającej stan oczekiwany (`createMember`, `updateMember` ze zmianą statusu, `assignRole`, `endRoleAssignment`, `addTeamMember`, `assignProjectMemberToTeam`, `updateTeamMemberDetails`, `removeTeamMember`, `deleteTeam`, zmiany `access_rule`, import z Fazy 4) akcja zwraca `suggestedAccessActions` dla dotkniętych członków.
- UI: przy zmianie statusu i tworzeniu członka — dialog „Sugerowane zmiany dostępów" z zaznaczonymi akcjami i przyciskami „Wykonaj zaznaczone" / „Później"; przy drobnych zmianach (zespoły, role) — toast „2 sugerowane zmiany dostępów" z przyciskiem otwierającym ten sam panel w `Sheet`. „Później" niczego nie gubi — rozbieżności zostają widoczne na profilu i w ustawieniach.
- Checkboxy „wyślij zaproszenie GitHub/Discord" w formularzu nowego członka (i w imporcie z Fazy 4) to wcześniejsza zgoda na te sugerowane akcje — wykonywane od razu po utworzeniu.

### Uprawnienia

- Nowy zasób w `src/lib/permissions/catalog.ts`: `integrations` — `read` (rozbieżności, inwentarz, log) i `write` (reguły, wykonywanie akcji, skan, powiązywanie/ignorowanie kont). Grupa „Zarząd" dostaje oba w seedzie.
- Liderzy projektu (`canManageProject`) widzą rozbieżności i wykonują akcje dotyczące **swoich** zespołów/projektu; nie zarządzają organizacją, serwerem ani dyskiem koła.
- Każdy członek widzi własne dostępy i może połączyć własne konta.

### Wspólne UI (`src/components/access/`)

- **Nawigacja ustawień**: grupa „Integracje" → `/settings/discord`, `/settings/github` (rozszerzenie istniejącej strony), `/settings/google-drive`, każda z tymi samymi zakładkami (`Tabs`):
  1. **Przegląd** — `IntegrationHealthCard` (konfiguracja, poprawność poświadczeń, konkretne brakujące uprawnienia), ostatni skan + „Skanuj teraz", liczniki rozbieżności per typ,
  2. **Rozbieżności** — `DiscrepancyTable` z filtrami (typ, osoba, cel), zaznaczaniem wielu wierszy i akcją zbiorczą „Wykonaj sugerowane"; każdy wiersz: osoba, stan oczekiwany vs faktyczny, powód („status: nieaktywny od 2026-03"), przyciski sugerowanych akcji,
  3. **Konta spoza HRownika** — `ExternalAccountsTable` (inwentarz `unknown_account` + `ignored`), z propozycjami dopasowań, „Powiąż z członkiem…" (combobox członków), „Ignoruj" (z powodem), „Usuń z platformy" (z potwierdzeniem),
  4. **Reguły** — `AccessRulesTable` „Kto → Co → Poziom" z edycją w `AccessRuleDialog` (RHF + zod),
  5. **Historia** — `AccessEventLog`.
- **Reguły edytowane też kontekstowo** (ten sam `AccessRuleDialog`, prefiltrowany): karta „Dostępy" na `/sections/[id]/edit`; sekcja „Dostępy" z pickerami w `role-form.tsx` zamiast pól tekstowych; ikony platform w wierszu zespołu na stronie projektu (kolor = stan, klik → popover z celem i „Zmień" / „Utwórz nowy").
- **Pickery celu** (`TargetCombobox`): lista ról / zespołów / dysków z API platformy (`listTargets`, cache Next.js z tagiem), wyszukiwanie, „Utwórz nowy…" tam, gdzie API pozwala. Żadnego wklejania ID.
- **Profil członka** — karta „Dostępy" (`MemberAccessCard`): per platforma powiązane konto (✓ połączone / wpisane ręcznie / brak) i lista celów z badge (`Ma dostęp`, `Zaproszony`, `Brakuje`, `Nadmiarowy`, `Wyjątek`) oraz powodem; sugerowane akcje inline; link do historii.
- **Lista członków** — filtr „Rozbieżności w dostępach" i ikona ostrzeżenia w wierszu; **pulpit** (`/`) — kafelek z liczbą otwartych rozbieżności dla osób z `integrations:read`.
- **Pierwsze logowanie nowego członka** — checklista „Dokończ onboarding": połącz Discord, połącz GitHub i zaakceptuj zaproszenie do organizacji, sprawdź adres studencki do Dysku.

### Łączenie kont

- better-auth `socialProviders` (`discord`, `github`; `google` opcjonalnie) z `disableSignUp: true` (tylko do łączenia, nie do logowania) + `account.accountLinking: { enabled: true, allowDifferentEmails: true }`; po stronie klienta `authClient.linkSocial({ provider, scopes })`.
- Hook better-auth na utworzenie `account` → `external_account` (`disposition: 'linked'`, `link_source: 'oauth'`) i skan zakresu tej osoby.
- Zarząd może powiązać konto ręcznie (z inwentarza albo wpisując handle, weryfikowany u platformy).

## Faza 5 — Discord: serwer, role i rozbieżności

Zakres issue #11 dla Discorda (zaproszenie na serwer, usunięcie z serwera, rola „Członek honorowy") połączony z pełnym zarządzaniem rolami. Razem z tą fazą powstaje wspólny fundament opisany wyżej.

### Konfiguracja

- Env: istniejące `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_INVITE_CHANNEL_ID` + `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` (OAuth tej samej aplikacji co bot), `CRON_SECRET`.
- Bot: `Manage Roles`, `Kick Members`, `Create Instant Invite`, opcjonalnie `Manage Nicknames`; intencja `GUILD_MEMBERS` (lista członków serwera do skanu). Rola bota musi być **wyżej** niż zarządzane role — `getHealth()` sprawdza to (`GET /guilds/{guild}/roles` + rola bota) i wypisuje role, którymi bot nie może zarządzać.

### Konta i inwentarz

- „Połącz Discord" (OAuth `identify` + `guilds.join`) → `external_account` ze snowflake.
- Skan: `GET /guilds/{guild}/members?limit=1000` (paginacja po `after`) → wszystkie konta serwera + ich role w `external_membership` (`discord_guild` + każda `discord_role`). Boty automatycznie `ignored` (`ignore_reason: 'bot'`).
- Migracja obecnych `member.discord_id` (usernames): dopasowanie do kont z inwentarza po nazwie (`match.ts`) → propozycje do zatwierdzenia w zakładce „Konta spoza HRownika".

### Serwer (issue #11)

- `missing_access` na `discord_guild` (nowy członek): akcje „Dodaj na serwer" (gdy konto połączone z `guilds.join`: `PUT /guilds/{guild}/members/{user}` z `access_token` i od razu właściwymi rolami) albo „Wygeneruj link zaproszenia" (`createOnboardingInvite`, jednorazowy, pokazany do skopiowania i w checkliście onboardingu).
- `extra_access` na `discord_guild` (nieaktywny / usuwany): „Usuń z serwera" (`DELETE /guilds/{guild}/members/{user}`).

### Role

- Cele `discord_role`: rola „Członek honorowy" (issue #11) oraz reguły dla sekcji (rola sekcji), ról (np. przewodniczący, role zarządowe z aktywnej kadencji → „Zarząd"), zespołów projektowych, opcjonalnie statusu `active` → „Członek".
- „Utwórz nową rolę" w pickerze → `POST /guilds/{guild}/roles` z nazwą podpowiedzianą z obiektu (np. „ToPWR · frontend").
- Akcje: „Nadaj rolę" / „Odbierz rolę" — istniejące `addGuildMemberRole` / `removeGuildMemberRole`.
- Opcjonalnie: rozbieżność `nickname_mismatch` (nick na serwerze ≠ `full_name`) z akcją „Ustaw nick" (`PATCH /guilds/{guild}/members/{user}`), włączana przełącznikiem na `/settings/discord`.
- Limity: `discordRequest` respektuje `429` + `retry_after`.

### Pliki

- `src/lib/integrations/discord.ts` (rozszerzony: `listGuildMembers`, `listGuildRoles`, `createGuildRole`, `addGuildMember`, `removeGuildMember`, `setGuildMemberNickname`, `getBotHealth`),
- `src/lib/access/**`, `src/db/schema/access.ts`, `src/actions/access.ts` (`saveAccessRule`, `deleteAccessRule`, `applyAccessActions`, `runAccessScanAction`, `linkExternalAccount`, `ignoreExternalAccount`, `setAccessException`),
- `src/components/access/**`, `src/app/(app)/settings/discord/page.tsx`, `src/app/api/v1/cron/access-scan/route.ts`,
- `src/lib/team-sync.ts` (`grantTeamAccess` / `revokeTeamAccess`) usunięte; ich wywołania w `projects.ts` i `members.ts` zastąpione zwracaniem `suggestedAccessActions`.

## Faza 6 — GitHub: organizacja, zespoły i rozbieżności

### Konfiguracja

- Istniejąca GitHub App (`GITHUB_APP_*`): uprawnienia organizacji `Members: Read & write` (zaproszenia, usuwanie, zespoły), repozytoriów `Administration: Read & write` (uprawnienia zespołów do repo). Subskrypcja webhooków `organization` i `membership` w istniejącym odbiorniku `/api/v1/webhooks/github` — aktualizują `external_membership` na bieżąco (np. przyjęcie zaproszenia), bez czekania na skan.
- Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (OAuth aplikacji do „Połącz GitHub").

### Konta i inwentarz

- „Połącz GitHub" → `external_account` z numerycznym ID (odporne na zmianę loginu); przy różnicy z `member.github_username` propozycja aktualizacji (+ `reattributeActivityForMember`).
- Skan: `GET /orgs/{org}/members` (z rolą), `GET /orgs/{org}/invitations`, `GET /orgs/{org}/failed_invitations`, `GET /orgs/{org}/teams` + `GET /orgs/{org}/teams/{team}/members` → `external_membership` (`github_org` ze stanem `member`/`invited`/`invite_failed`, każda `github_team` z `member`/`maintainer`).
- Nieznane konta: członkowie organizacji bez powiązanego członka HRownika; boty i konta serwisowe → `ignored`.

### Organizacja i zespół „KN Solvro" (issue #11)

- `missing_access` na `github_org`: „Zaproś do organizacji" (`inviteMemberToOrg`); `pending_invite` / `invite_failed`: „Wyślij ponownie", „Anuluj zaproszenie".
- `extra_access` na `github_org` (nieaktywny / usuwany): „Usuń z organizacji" (`DELETE /orgs/{org}/memberships/{username}`).
- `github_team` „KN Solvro": status `active` → dodanie; każdy inny status → usunięcie z zespołu (członek zostaje w organizacji).

### Zespoły projektów i sekcji

- Picker z `GET /orgs/{org}/teams` + „Utwórz zespół" (`POST /orgs/{org}/teams`). Konwencja: projekt → zespół nadrzędny (slug projektu), zespoły projektu → zespoły podrzędne (`parent_team_id`); sekcje → zespoły sekcji.
- Przy tworzeniu projektu (`/projects/new`) checkbox „Utwórz zespół na GitHubie" (domyślnie zaznaczony, gdy GitHub skonfigurowany); przy tworzeniu zespołu projektu — „Utwórz podzespół".
- Poziom: `maintainer` dla ról z grantem `project_team:lead`, inaczej `member` → rozbieżność `level_mismatch` z akcją „Zmień poziom" (`addOrUpdateMembershipForUserInOrg` z `role`).
- Uprawnienia zespołów do repozytoriów: `team_repository` → oczekiwany poziom (`push` domyślnie, `maintain` dla zespołu nadrzędnego projektu); rozbieżność `repo_permission_mismatch` z akcją „Ustaw uprawnienie" (`PUT /orgs/{org}/teams/{team}/repos/{owner}/{repo}`). Poziom wybierany tam, gdzie dziś przypisuje się repo do zespołu (`updateTeamRepositories`, `assignRepoToTeam`).
- `/settings/github`: zakładki wspólnego UI obok istniejących podstron (repozytoria bez projektu, repozytoria bez zespołu, kontrybutorzy spoza listy członków — ta ostatnia przechodzi na `external_account`).

### Pliki

- `src/lib/integrations/github.ts` (rozszerzony: `listOrgMembers`, `listOrgInvitations`, `listFailedOrgInvitations`, `cancelOrgInvitation`, `removeOrgMember`, `listOrgTeams`, `listTeamMembers`, `createOrgTeam`, `setTeamRepoPermission`),
- `src/lib/access/providers/github.ts`, obsługa `organization` / `membership` w `src/app/api/v1/webhooks/github/route.ts`.

## Faza 7 — Dysk Google: dysk współdzielony i rozbieżności

### Konfiguracja

- Konto serwisowe Google Cloud z włączonym Drive API; env `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Biblioteka: `@googleapis/drive` + `google-auth-library`.
- **Bez domain-wide delegation**: konto serwisowe dodawane jako „Menedżer" dysku współdzielonego koła (i ewentualnych kolejnych dysków). `/settings/google-drive` pokazuje adres konta serwisowego z „Kopiuj" i instrukcją; `getHealth()` sprawdza dostęp (`drives.get`).
- HRownik nie tworzy dysków — rejestruje istniejące przez wklejenie linku (ID z URL-a, nazwa → `target_label`).

### Konto studenckie jako tożsamość (issue #11)

- Domyślna tożsamość Google = **adres studencki** członka (`@student.pwr.edu.pl`) z `member_email` (z logowania USOS, z importu Eventownika); gdy go brak, a znany jest indeks — propozycja `<indeks>@student.pwr.edu.pl` do zatwierdzenia (rozbieżność `missing_identity` z akcją „Użyj adresu studenckiego").
- Zarząd może wskazać inny adres (np. dla doktorantów / absolwentów — członków honorowych); „Połącz Google" (OAuth) jako opcja dla członka.

### Dysk współdzielony (issue #11)

- Reguła: `member_status ≠ inactive` → `drive` (dysk współdzielony koła), poziom domyślny `writer` (konfigurowalny).
- Skan: `permissions.list` (`supportsAllDrives: true`) → `external_membership` z `permissionId` w `external_ref`; adresy bez członka → `unknown_account` (konta organizacyjne/goście → „Ignoruj").
- Akcje: „Dodaj do dysku" (`permissions.create`, `sendNotificationEmail: true`), „Usuń z dysku" (`permissions.delete` po `permissionId`), „Zmień poziom" (`permissions.update`).
- Rozszerzenie (po zakresie issue): kolejne dyski/foldery z regułami dla projektów, sekcji, zarządu; istniejące `project.drive_folder_url` podpowiada regułę na stronie projektu (karta „Dysk").

### Pliki

- `src/lib/integrations/google-drive.ts` (`getDriveClient`, `getDriveResource`, `listPermissions`, `createPermission`, `updatePermission`, `deletePermission`),
- `src/lib/access/providers/google-drive.ts`, `src/app/(app)/settings/google-drive/page.tsx`.
- Jeśli „grupka" z onboardingu okaże się Grupą Google, może zostać kolejną platformą w tym samym mechanizmie (wymaga Workspace + Admin SDK).

## Faza 8 — Publikowanie danych HRownika (README, `.github`, strona, docs)

Pozostała część issue #11 („Dodatkowe miejsca do synchronizacji") i issue [#63](https://github.com/Solvro/web-hrownik/issues/63). HRownik przestaje być kopią Directusa — staje się źródłem dla strony i dokumentacji. Dwa kierunki: **HRownik pcha** treść do repozytoriów, **strona i docs pobierają** dane z API HRownika.

### Publiczne dane i zgody

- Pole `member.show_on_website` (boolean, domyślnie `false` dla nowych, `true` dla zaimportowanych z Directusa `pnpm import:directus-team`), edytowalne przez członka w profilu („Pokazuj mnie na stronie Solvro i w dokumentacji").
- Do publikacji tylko pola publiczne: `full_name`, `photo_url`, `bio`, sociale (`github_username`, `linkedin_url`, …), sekcje, role, zespoły projektów — nigdy e-maile, indeks, dane studiów, notatki HR.

### 8.1 README repozytoriów projektów (HRownik pcha — #63)

- Markery w README, dodawane przez kierownika projektu:
  ```md
  <!-- hrownik-team-section-start -->
  <!-- hrownik-team-section-end -->
  ```
- Silnik `src/lib/publishing/readme.ts`: dla repo z `project_repository` pobiera README (`GET /repos/{owner}/{repo}/readme`), podmienia treść między markerami na wygenerowaną tabelę/listę zespołu (zespoły, osoby, role, linki do GitHuba; tylko `show_on_website` lub członkowie z kontem GitHub — do ustalenia), commituje przez GitHub App (`PUT /repos/{owner}/{repo}/contents/{path}`, `docs: update team section [hrownik]`). Brak zmian → brak commita.
- Gdy gałąź domyślna jest chroniona → zamiast commita PR z gałęzi `hrownik/team-section`.
- Wyzwalanie: po zmianie składu zespołu (w `after()`, z debounce per projekt) i ręcznie przyciskiem. Na stronie projektu karta „README" z listą repo (markery znalezione / brak / ostatnia aktualizacja / błąd) i podglądem diffu przed ręcznym wypchnięciem; przełącznik per projekt „Aktualizuj automatycznie".
- Uprawnienie GitHub App: `Contents: Read & write`.

### 8.2 `Solvro/.github` i `Solvro/.github-private` (HRownik pcha)

- Ten sam silnik markerów, inne bloki: `<!-- hrownik-board-section-start/end -->` (aktualny zarząd), `<!-- hrownik-projects-section-start/end -->` (projekty publiczne, linki), `<!-- hrownik-members-section-start/end -->` (tylko w `.github-private`).
- Wyzwalanie: zmiana aktywnej kadencji / ról zarządowych, statusu lub widoczności projektu, statusu członka + ręcznie z `/settings/github` (zakładka „Publikowanie" z listą miejsc, stanem i podglądem diffu).

### 8.3 Strona Solvro — `/team` (strona pobiera z HRownika)

- `web-solvro.pwr.edu.pl` (Next.js) dziś pobiera zespół z Directusa (`cms.solvro.pl`, GraphQL Zeus). Zmiana po stronie strony: dane zespołu z HRownika przez `/api/v1` z kluczem API (`/settings/api-keys`, klucz „Strona Solvro").
- Po stronie HRownika: endpoint `GET /api/v1/public/team` (zagregowany widok: aktualny zarząd, sekcje z członkami, tylko `show_on_website`, tylko pola publiczne), żeby strona nie składała danych z wielu zasobów.
- Odświeżanie: strona cache'uje (`revalidate`); HRownik po zmianach danych publicznych woła webhook rewalidacji strony (`WEBSITE_REVALIDATE_URL` + sekret) — opcjonalnie.
- Zdjęcia: `photo_url` dziś wskazuje na assety Directusa; docelowe przechowywanie zdjęć do ustalenia (otwarte pytanie).

### 8.4 Solvro Docs (docs pobierają z HRownika)

- `web-solvro-docs` (Astro Starlight) dziś przy buildzie pobiera osoby z Directusa (`getTeam`, `getPersonByName` w `src/components/TeamMembers.tsx`). Zmiana po stronie docs: te same komponenty pobierają dane z HRownika (`/api/v1/public/team`, `/api/v1/boards`, `/api/v1/sections`) z kluczem API w env buildu. Strony `solvro/Structure`, `solvro/IX_Board`, `solvro/poprzednie-zarzady/*` generowane z kadencji (`board_term`) zamiast ręcznie utrzymywanych list.
- Docs są statyczne, więc po zmianach (kadencje, role zarządowe, sekcje) HRownik wywołuje przebudowę: `repository_dispatch` do `Solvro/web-solvro-docs` przez GitHub App (workflow docs nasłuchuje `hrownik-data-changed`), z debounce.

### Pliki

- `src/lib/publishing/{markers,readme,org-profile,render}.ts`, `src/lib/publishing/triggers.ts` (`schedulePublishing(scope)`),
- `src/actions/publishing.ts` (`previewPublication`, `publishNow`, `setProjectReadmeAutoUpdate`),
- `src/app/api/v1/public/team/route.ts`, `src/components/publishing/**`,
- `publication_target` (miejsce, ostatni commit/PR, ostatni błąd, ostatnia aktualizacja) w `src/db/schema/publishing.ts`.

## Faza 9 — Szablony projektów i generowanie repo

- Wybór tech-stacku przy `/projects/new` → tworzenie repo w organizacji Solvro z template repo (GitHub API `generateRepository` z template), wstępnie skonfigurowanego `@solvro/config`.
- Wymaga katalogu znanych template-repo per stack (do ustalenia z zarządem, jakie stacki/szablony istnieją).
- Korzysta z Fazy 6: nowe repo od razu dostaje uprawnienia zespołu projektu na GitHubie (`team_repository` + `setTeamRepoPermission`).

## Faza 10 — Zakończenie projektu (częściowo)

- Zrobione: pole `project.report_drive_url` (edytowalne przy statusie `completed`), `ended_at` ustawiane przy zmianie statusu na `completed`, historia statusów w `project_status_history`.
- Do zrobienia: po zmianie statusu na `completed` utworzenie issue w repo „KN Solvro" przypisanego do liderów projektu („wypełnij sprawozdanie projektu"), z checklistą 4 kroków śledzoną w HRowniku (status checklisty).
- Po zakończeniu projektu: zespoły przestają dawać dostęp, więc ich role Discord, zespoły GitHub i dyski projektu pojawiają się jako rozbieżności (Fazy 5–7) z sugerowanymi akcjami: odebrać, zostawić (wyjątek) albo obniżyć do `reader`/archiwum; sekcja zespołu w README (Faza 8) dostaje oznaczenie „projekt zakończony".

## Faza 11 — Wiedza, finanse i spotkania zarządu

Celem tej fazy jest dalsze ograniczenie rozproszonych Exceli, dokumentów i notatek. HRownik ma stać się miejscem, w którym zarząd i kierownicy projektów utrzymują wiedzę operacyjną, budżety oraz historię spotkań/decyzji.

### 11.1 Knowledge management

Zakres:

- Baza wiedzy z dokumentami/notatkami tworzonymi w HRowniku, zamiast trzymania kluczowych instrukcji w prywatnych plikach.
- Kategorie lub tagi, np. `zarząd`, `sekcje`, `projekty`, `finanse`, `rekrutacja`, `wydarzenia`, `infrastruktura`.
- Widoczność dokumentów: wszyscy członkowie, tylko zarząd, tylko liderzy projektów albo osoby przypisane do konkretnego projektu.
- Dokumenty projektowe przypięte do projektu: decyzje, linki, ustalenia, instrukcje wdrożeniowe, retrospekcje.
- Wyszukiwanie po tytule i treści.
- Metadane: autor, ostatni edytujący, `created_at`, `updated_at`.

Proponowany model danych:

```
knowledge_article
  id, title, slug, content
  visibility: enum('all_members','board','project_leads','project')
  project_id (nullable, fk -> project.id)
  author_member_id -> member.id
  last_editor_member_id -> member.id
  created_at, updated_at

knowledge_tag
  id, name, slug

knowledge_article_tag
  article_id -> knowledge_article.id
  tag_id -> knowledge_tag.id
```

Trasy:

- `/knowledge` — lista i wyszukiwarka artykułów.
- `/knowledge/new` — tworzenie artykułu.
- `/knowledge/[slug]` — widok artykułu.
- `/knowledge/[slug]/edit` — edycja zgodnie z uprawnieniami.
- `/projects/[id]` — sekcja z artykułami przypiętymi do projektu.

Uprawnienia:

- Zarząd tworzy i edytuje wszystkie artykuły.
- Liderzy projektów tworzą i edytują artykuły przypięte do swoich projektów.
- Członkowie czytają tylko artykuły, do których mają widoczność.

### 11.2 Finanse projektów i budżet organizacji

Zakres:

- Moduł ma zastąpić małe Excelki używane do budżetów, rozliczeń i planowania kosztów.
- Budżet organizacji obejmuje wpływy i wydatki całego koła.
- Budżet projektu obejmuje wpływy i wydatki konkretnego projektu.
- Każda pozycja budżetu rozróżnia plan i wykonanie: kwotę planowaną, kwotę rzeczywistą, datę planowaną, datę realizacji.
- Wpisy mają kategorie, opis, status i opcjonalny link do faktury, potwierdzenia, dokumentu Drive albo innego załącznika.
- Kierownicy projektów mogą edytować budżety swoich projektów.
- Zarząd widzi i edytuje budżet organizacji oraz wszystkie budżety projektowe.
- Widoki pokazują podsumowania: suma planowanych wpływów, suma planowanych wydatków, wykonanie, różnica względem planu, nierozliczone pozycje.

Proponowany model danych:

```
budget
  id, name
  scope: enum('organization','project')
  project_id (nullable, fk -> project.id)
  fiscal_year (nullable)
  created_at, updated_at

budget_category
  id, name
  type: enum('income','expense')

budget_entry
  id, budget_id -> budget.id
  category_id -> budget_category.id
  type: enum('income','expense')
  status: enum('planned','approved','incurred','settled','rejected')
  title, description
  planned_amount, actual_amount
  planned_at, occurred_at
  document_url (nullable)
  created_by_member_id -> member.id
  updated_by_member_id -> member.id
  created_at, updated_at
```

Trasy:

- `/budget` — budżet organizacji, dostępny dla zarządu i osób finansowych.
- `/budget/projects` — zbiorczy widok budżetów projektowych.
- `/projects/[id]/budget` — budżet konkretnego projektu dla zarządu i kierowników projektu.
- `/projects/[id]/budget/new` — dodanie pozycji budżetowej projektu.
- `/budget/entries/[id]/edit` — edycja pozycji budżetowej.

Otwarte decyzje:

- Czy kwoty mają być tylko w PLN, czy potrzebne są waluty?
- Czy potrzebny jest workflow akceptacji pozycji przez skarbnika/zarząd przed oznaczeniem jako `approved`?
- Czy załączniki mają być tylko URL-em do Drive'a, czy pliki mają być uploadowane do aplikacji?

### 11.3 Agendy i spotkania zarządowe

Zakres:

- Rejestr spotkań zarządu i spotkań strategicznych.
- Agenda jako lista punktów przygotowywanych przed spotkaniem.
- Notatki, decyzje i action itemy uzupełniane po spotkaniu.
- Obecność członków na spotkaniach, w tym informacja „kto pojawił się na strategicznym”.
- Action itemy mają właściciela, termin i status, żeby dało się wracać do ustaleń z poprzednich spotkań.

Proponowany model danych:

```
board_meeting
  id, title
  type: enum('board','strategic','operational','other')
  status: enum('planned','completed','cancelled')
  scheduled_at, completed_at
  summary
  created_by_member_id -> member.id
  created_at, updated_at

board_meeting_attendee
  meeting_id -> board_meeting.id
  member_id -> member.id
  presence: enum('present','absent','excused')

board_meeting_agenda_item
  id, meeting_id -> board_meeting.id
  title, description
  owner_member_id (nullable, fk -> member.id)
  position
  decision_notes

board_meeting_action_item
  id, meeting_id -> board_meeting.id
  agenda_item_id (nullable, fk -> board_meeting_agenda_item.id)
  title, description
  owner_member_id -> member.id
  due_at
  status: enum('open','done','cancelled')
```

Trasy:

- `/board/meetings` — lista spotkań zarządu.
- `/board/meetings/new` — utworzenie spotkania i agendy.
- `/board/meetings/[id]` — agenda, obecność, notatki, decyzje i action itemy.
- `/board/meetings/[id]/edit` — edycja spotkania.
- `/members/[id]` — sekcja z historią obecności na spotkaniach zarządu/strategicznych, widoczna zgodnie z uprawnieniami.

Uprawnienia:

- Zarząd zarządza spotkaniami, agendami, obecnością i action itemami.
- Członek przypisany do action itemu może aktualizować status własnego zadania, jeśli zarząd zdecyduje, że ma to być dostępne poza zarządem.
- Dane ze spotkań strategicznych domyślnie są board-only, dopóki konkretny typ notatek nie zostanie oznaczony jako widoczny szerzej.

---

## Faza 12 — Coolify: dostępy do infrastruktury (wymaga researchu)

Propozycja z dyskusji w issue #11. Coolify (hosting aplikacji Solvro) jako kolejna platforma we wspólnym mechanizmie dostępów z Faz 5–7: inwentarz kont, reguły (np. liderzy projektu / sekcja DevOps → dostęp do zespołu/projektu w Coolify), rozbieżności z sugerowanymi akcjami.

Do zbadania przed planowaniem szczegółów:

- czy API Coolify pozwala listować i zarządzać członkami zespołów (zaproszenia, role, usuwanie) — czy tylko zasobami (aplikacje, serwery),
- jak konta Coolify mapują się na członków (e-mail? logowanie przez GitHub/OAuth?),
- granularność dostępu (zespół Coolify per projekt? role `owner`/`admin`/`member`) i czy da się ją wyrazić przez `access_rule`,
- czy zamiast zarządzania kontami wystarczy logowanie do Coolify przez Solvro Auth (Keycloak) z grupami nadawanymi z HRownika.

## Otwarte pytania (do ustalenia przed odpowiednią fazą, nie blokują Fazy 1)

- Czy `emailAndPassword` w better-auth zostaje na stałe (np. dla kont serwisowych) czy docelowo tylko OIDC + USOS?
- Jaki jest faktyczny cel „grupki" w onboardingu?
- Jakie tech-stacki/template-repo mają być dostępne przy tworzeniu nowego projektu (Faza 9)?
- Bezpośrednie API Eventownika (Faza 4.2) — wymaga kluczy API/webhooków po stronie Eventownika.
- Czy moduł finansów ma obsługiwać tylko PLN, czy też wiele walut?
- Kto formalnie zatwierdza pozycje budżetowe: zarząd, skarbnik, czy kierownik projektu do określonego limitu?
- Czy dokumenty finansowe mają być przechowywane jako linki do Drive'a, czy jako upload plików do aplikacji?
- Czy notatki ze spotkań zarządu mają mieć granularną widoczność per punkt agendy, czy wystarczy widoczność całego spotkania?
- Jaki domyślny poziom dostępu do dysku współdzielonego koła (`writer` / `fileOrganizer`) i czy członkowie honorowi mają go zachować (Faza 7)?
- Jakie dane ma zawierać `.github-private` (pełna lista członków? kontakty?) i kto z zespołu ma trafiać do sekcji README — wszyscy czy tylko osoby z `show_on_website` (Faza 8)?
- Gdzie przechowywać zdjęcia członków po odejściu od Directusa (Faza 8)?
- Czy Coolify pozwala zarządzać członkami zespołów przez API, czy lepiej oprzeć dostęp o Solvro Auth (Faza 12)?
