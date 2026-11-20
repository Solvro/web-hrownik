import { inject } from "vitest";

// Runs before each test file's imports, so `@/db` connects to the
// throwaway database created in test-database.ts.
process.env.DATABASE_URL = inject("databaseUrl");
