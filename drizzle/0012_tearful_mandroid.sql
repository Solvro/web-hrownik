CREATE TABLE "api_key_endpoint_stat" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"resource" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "api_key_endpoint_stat_key_resource_unique" UNIQUE("api_key_id","resource")
);
--> statement-breakpoint
ALTER TABLE "api_key_endpoint_stat" ADD CONSTRAINT "api_key_endpoint_stat_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;