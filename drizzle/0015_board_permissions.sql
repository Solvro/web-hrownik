INSERT INTO "permission_grant" ("id", "permission_group_id", "resource", "action")
SELECT gen_random_uuid()::text, "permission_group"."id", grant_pair.resource, grant_pair.action
FROM "permission_group"
CROSS JOIN (VALUES ('boards', 'read'), ('boards', 'write')) AS grant_pair(resource, action)
WHERE "permission_group"."name" = 'Zarząd'
ON CONFLICT ("permission_group_id", "resource", "action") DO NOTHING;
