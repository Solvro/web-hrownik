import { ApiEndpointUsageChart } from "@/components/api-keys/api-endpoint-usage-chart";
import { ApiKeySnippetsCard } from "@/components/api-keys/api-key-snippets-card";
import type { ApiKeyData } from "@/components/api-keys/api-key-table";
import { ApiKeyTable } from "@/components/api-keys/api-key-table";
import { ApiKeyUsageCharts } from "@/components/api-keys/api-key-usage-charts";

function aggregateEndpointUsage(apiKeys: ApiKeyData[]) {
  const totals = new Map<string, number>();
  for (const key of apiKeys) {
    for (const stat of key.endpointStats) {
      totals.set(
        stat.resource,
        (totals.get(stat.resource) ?? 0) + stat.requestCount,
      );
    }
  }
  return [...totals.entries()].map(([resource, requestCount]) => ({
    resource,
    requestCount,
  }));
}

export function ApiKeysPanel({ apiKeys }: { apiKeys: ApiKeyData[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ApiKeyUsageCharts
          apiKeys={apiKeys.map((key) => ({
            name: key.name,
            requestCount: key.requestCount,
          }))}
        />
        <div className="sm:col-span-2">
          <ApiEndpointUsageChart
            endpointUsage={aggregateEndpointUsage(apiKeys)}
          />
        </div>
        <div className="sm:col-span-2">
          <ApiKeySnippetsCard />
        </div>
      </div>
      <ApiKeyTable apiKeys={apiKeys} />
    </div>
  );
}
