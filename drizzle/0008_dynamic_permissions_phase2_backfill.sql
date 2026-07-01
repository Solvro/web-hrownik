-- Seed the two permission groups.
INSERT INTO "permission_group" ("id", "name", "description") VALUES
	(gen_random_uuid()::text, 'Zarząd', 'Pełne zarządzanie członkami, sekcjami, projektami i rolami.'),
	(gen_random_uuid()::text, 'Liderzy projektów', 'Prowadzenie własnego projektu (nadawane przez rolę w zespole).');
--> statement-breakpoint

-- Grant "Zarząd" full read/write on every resource.
INSERT INTO "permission_grant" ("id", "permission_group_id", "resource", "action")
SELECT gen_random_uuid()::text, pg."id", grant_pair.resource, grant_pair.action
FROM "permission_group" pg
CROSS JOIN (VALUES
	('members', 'read'), ('members', 'write'),
	('sections', 'read'), ('sections', 'write'),
	('projects', 'read'), ('projects', 'write'),
	('roles', 'read'), ('roles', 'write')
) AS grant_pair(resource, action)
WHERE pg."name" = 'Zarząd';
--> statement-breakpoint

-- Grant "Liderzy projektów" the project-lead capability.
INSERT INTO "permission_grant" ("id", "permission_group_id", "resource", "action")
SELECT gen_random_uuid()::text, pg."id", 'project_team', 'lead'
FROM "permission_group" pg
WHERE pg."name" = 'Liderzy projektów';
--> statement-breakpoint

-- Link the existing board-scope roles (prezes/wiceprezes/sekretarz) to "Zarząd".
INSERT INTO "role_definition_permission_group" ("id", "role_definition_id", "permission_group_id")
SELECT gen_random_uuid()::text, rd."id", pg."id"
FROM "role_definition" rd
CROSS JOIN "permission_group" pg
WHERE rd."scope" = 'board' AND pg."name" = 'Zarząd';
--> statement-breakpoint

-- Create a project-scope role_definition for every distinct team_member.role
-- value that isn't already represented, preserving the exact existing text —
-- historical data may contain variants beyond the UI's curated option list.
INSERT INTO "role_definition" ("id", "scope", "name", "permission_level")
SELECT gen_random_uuid()::text, 'project', distinct_role.role, 'member'
FROM (SELECT DISTINCT "role" FROM "team_member" WHERE "role" IS NOT NULL) AS distinct_role
WHERE NOT EXISTS (
	SELECT 1 FROM "role_definition" rd
	WHERE rd."scope" = 'project' AND lower(rd."name") = lower(distinct_role.role)
);
--> statement-breakpoint

-- Backward-compat only: link whichever project-scope roles match the old
-- hardcoded lead check (pm/po/techlead/ts) to "Liderzy projektów", so nobody
-- loses lead access across the migration. Everything else (e.g. any
-- "Project Manager"-style full names already in the data) is left unlinked —
-- the board reviews and links those deliberately in the new panel.
INSERT INTO "role_definition_permission_group" ("id", "role_definition_id", "permission_group_id")
SELECT gen_random_uuid()::text, rd."id", pg."id"
FROM "role_definition" rd
CROSS JOIN "permission_group" pg
WHERE rd."scope" = 'project'
	AND lower(rd."name") IN ('pm', 'po', 'techlead', 'ts')
	AND pg."name" = 'Liderzy projektów';
--> statement-breakpoint

-- Backfill team_member.role_definition_id from the now-complete set of
-- project-scope role_definition rows.
UPDATE "team_member" tm
SET "role_definition_id" = rd."id"
FROM "role_definition" rd
WHERE rd."scope" = 'project'
	AND lower(rd."name") = lower(tm."role")
	AND tm."role_definition_id" IS NULL;
