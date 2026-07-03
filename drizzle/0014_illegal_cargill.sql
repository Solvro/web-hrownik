DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'project_team'
      AND enumtypid = 'public.role_scope'::regtype
  ) THEN
    CREATE TYPE "public"."role_scope_new" AS ENUM('section', 'project_team', 'project', 'board');
    ALTER TABLE "role_definition" ALTER COLUMN "scope" TYPE "public"."role_scope_new" USING "scope"::text::"public"."role_scope_new";
    DROP TYPE "public"."role_scope";
    ALTER TYPE "public"."role_scope_new" RENAME TO "role_scope";
  END IF;
END $$;
--> statement-breakpoint

UPDATE "role_definition"
SET "scope" = 'project_team'
WHERE "scope" = 'project'
  AND "name" <> 'Product Owner';
--> statement-breakpoint

INSERT INTO "role_definition" ("id", "scope", "name") VALUES
  (gen_random_uuid()::text, 'section', 'przewodniczący'),
  (gen_random_uuid()::text, 'section', 'wiceprzewodniczący'),
  (gen_random_uuid()::text, 'section', 'członek')
ON CONFLICT ("scope", "name") DO NOTHING;
--> statement-breakpoint

INSERT INTO "role_assignment" (
  "id",
  "member_id",
  "role_definition_id",
  "section_id",
  "started_at",
  "ended_at"
)
SELECT
  gen_random_uuid()::text,
  "member_section"."member_id",
  "role_definition"."id",
  "member_section"."section_id",
  COALESCE("member_section"."joined_at", '2000-01-01'::timestamp),
  "member_section"."left_at"
FROM "member_section"
JOIN "role_definition"
  ON "role_definition"."scope" = 'section'
 AND "role_definition"."name" = 'członek'
WHERE NOT EXISTS (
  SELECT 1
  FROM "role_assignment"
  WHERE "role_assignment"."member_id" = "member_section"."member_id"
    AND "role_assignment"."role_definition_id" = "role_definition"."id"
    AND "role_assignment"."section_id" = "member_section"."section_id"
    AND "role_assignment"."started_at" IS NOT DISTINCT FROM COALESCE("member_section"."joined_at", '2000-01-01'::timestamp)
    AND "role_assignment"."ended_at" IS NOT DISTINCT FROM "member_section"."left_at"
);
