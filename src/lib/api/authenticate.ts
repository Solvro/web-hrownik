import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { apiKey, apiKeyEndpointStat } from "@/db/schema/api-keys";
import { hashApiKeySecret } from "@/lib/api-keys";

type ApiKeyAuthResult = { ok: true } | { ok: false; response: NextResponse };

function unauthorized(message: string): ApiKeyAuthResult {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 401 }),
  };
}

/**
 * Gates the public REST API (/api/v1/*) behind an API key. Keys are issued
 * from Ustawienia → Klucze API and sent as `Authorization: Bearer <key>`.
 */
export async function authenticateApiKey(
  request: Request,
  resource: string,
): Promise<ApiKeyAuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, secret] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer" || !secret) {
    return unauthorized(
      "Brak klucza API. Wyślij go w nagłówku Authorization: Bearer <klucz>.",
    );
  }

  const keyHash = hashApiKeySecret(secret);
  const found = await db.query.apiKey.findFirst({
    where: eq(apiKey.keyHash, keyHash),
  });
  if (found === undefined) {
    return unauthorized("Nieprawidłowy klucz API.");
  }

  const now = new Date();
  await Promise.all([
    db
      .update(apiKey)
      .set({
        requestCount: sql`${apiKey.requestCount} + 1`,
        lastUsedAt: now,
      })
      .where(eq(apiKey.id, found.id)),
    db
      .insert(apiKeyEndpointStat)
      .values({
        apiKeyId: found.id,
        resource,
        requestCount: 1,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: [apiKeyEndpointStat.apiKeyId, apiKeyEndpointStat.resource],
        set: {
          requestCount: sql`${apiKeyEndpointStat.requestCount} + 1`,
          lastUsedAt: now,
        },
      }),
  ]);

  return { ok: true };
}
