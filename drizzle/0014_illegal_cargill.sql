DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'project_team'
      AND enumtypid = 'public.role_scope'::regtype
  ) THEN
    ALTER TYPE "public"."role_scope" ADD VALUE 'project_team' BEFORE 'project';
  END IF;
END $$;
--> statement-breakpoint

UPDATE "role_definition"
SET "scope" = 'project_team'
WHERE "scope" = 'project'
  AND "name" <> 'Product Owner';
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
  "member_section"."joined_at",
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
    AND "role_assignment"."ended_at" IS NOT DISTINCT FROM "member_section"."left_at"
);
