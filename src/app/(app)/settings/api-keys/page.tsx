import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ApiKeysPanel } from "@/components/api-keys/api-keys-panel";
import { db } from "@/db";
import { apiKey } from "@/db/schema/api-keys";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function ApiKeysSettingsPage() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    redirect("/login");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "roles", "write")) {
    redirect("/");
  }

  const apiKeys = await db.query.apiKey.findMany({
    orderBy: desc(apiKey.createdAt),
    with: { createdBy: true, endpointStats: true },
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Klucze API</h1>
        <p className="text-muted-foreground text-sm">
          Klucze uprawniają zewnętrzne usługi do odczytu danych przez /api/v1.
          Każdy klucz jest pokazywany w pełni tylko raz, zaraz po wygenerowaniu.
        </p>
      </div>
      <ApiKeysPanel
        apiKeys={apiKeys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          requestCount: key.requestCount,
          endpointStats: key.endpointStats
            .filter((stat) => stat.requestCount > 0)
            .map((stat) => ({
              resource: stat.resource,
              requestCount: stat.requestCount,
            })),
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          createdByMemberId: key.createdBy?.id ?? null,
          createdByName: key.createdBy?.fullName ?? null,
          createdByPhotoUrl: key.createdBy?.photoUrl ?? null,
        }))}
      />
    </div>
  );
}
