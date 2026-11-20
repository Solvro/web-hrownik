import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Creates a disposable database on the server TEST_DATABASE_URL points at,
 * migrates and seeds it, and drops it afterwards — the database named in the
 * URL itself is only used to connect and is never written to.
 */
export async function setup(project: TestProject) {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (serverUrl === undefined || serverUrl === "") {
    throw new Error(
      "Integration tests need a Postgres server: set TEST_DATABASE_URL (see README).",
    );
  }

  const name = `hrownik_test_${Date.now()}_${process.pid}`;
  const server = postgres(serverUrl, { max: 1, onnotice: () => null });
  await server.unsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const databaseUrl = url.toString();

  const client = postgres(databaseUrl, { max: 1, onnotice: () => null });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();

  execFileSync("pnpm", ["exec", "tsx", "src/db/seed.ts"], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "test-password",
    },
    stdio: "ignore",
  });

  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await server.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await server.end();
  };
}
