# HRownik

HRownik is an internal operations system for Koło Naukowe Solvro.

It is meant to be the single source of truth for the people, sections, projects, teams and relationships that make up the organization. The project was created because the same organizational data used to live in too many places at once: the website, documentation pages, Discord, GitHub, project READMEs, Google Drive spreadsheets and other ad-hoc files.

When those sources drift apart, it becomes hard to know which data is current, who belongs to which team, who leads a project, what repositories belong to what project, and what changed over time. HRownik brings that information into one place and keeps history where it matters.

## Who It Is For

- The board, to manage members, sections, projects and organizational relationships in one place.
- Project leads, to keep project teams, roles and repositories up to date.
- Members, to view and maintain their own organizational profile and see their project history.

## What It Covers

- Member profiles with statuses, contact links, university-related data, section membership and role history.
- Project records with status, visibility, production links, Drive links, repositories and teams.
- Team membership with project-specific roles and historical join/leave dates.
- Sections and organizational roles, including board and section-level responsibilities.
- GitHub repository connections, project activity and member activity.
- Permission-aware access so different users can manage only the data they are responsible for.
- Onboarding and synchronization hooks for keeping external services aligned with HRownik data.

## Why It Exists

HRownik reduces duplicated work and stale records. Instead of updating the same member, project or team information across multiple tools, Solvro can maintain it in one place and use that source to support the rest of the organization.

The goal is not just to store data, but to preserve organizational continuity: who was involved, when things changed, how projects evolved, and what the current state of the organization actually is.

## Local Development

Requirements: Node.js ≥ 22.12, pnpm and Docker.

```bash
cp .env.example .env            # fill in at least the admin account
docker compose up -d --wait     # Postgres 17, same as CI; POSTGRES_PORT=5433 if 5432 is taken
pnpm install
pnpm db:migrate
pnpm db:seed                    # roles, permission groups and the admin account
pnpm dev
```

Tests:

```bash
pnpm test --project unit        # pure logic, no database needed
TEST_DATABASE_URL=postgresql://hrownik:hrownik@localhost:5432/hrownik pnpm test
```

Integration tests create a throwaway database on the server `TEST_DATABASE_URL` points at (migrated and seeded from scratch) and drop it when they finish, so the database named in the URL is never modified.
