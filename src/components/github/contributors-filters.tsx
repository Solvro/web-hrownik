"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ListFilters } from "@/components/list-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeLabels: Record<string, string> = {
  bot: "bot",
  "external contributor": "spoza listy",
};

const pageSizeOptions = [10, 25, 50, 100] as const;
const defaultPageSize = 25;

export function ContributorsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const [query, setQuery] = useState(searchParameters.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>(
    searchParameters.get("type") ?? "all",
  );
  const [pageSize, setPageSize] = useState<number>(() => {
    const fromUrl = Number(searchParameters.get("pageSize"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : defaultPageSize;
  });

  function updateUrl(updates: Record<string, string | number>) {
    const parameters = new URLSearchParams(searchParameters.toString());
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = String(value);
      const isDefault =
        (key === "q" && stringValue === "") ||
        (key === "type" && stringValue === "all") ||
        (key === "page" && stringValue === "1") ||
        (key === "pageSize" && stringValue === String(defaultPageSize));
      if (isDefault) {
        parameters.delete(key);
      } else {
        parameters.set(key, stringValue);
      }
    }
    router.replace(
      parameters.size === 0 ? pathname : `${pathname}?${parameters.toString()}`,
      { scroll: false },
    );
  }

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
      <ListFilters
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          updateUrl({ q: value, page: 1 });
        }}
        queryPlaceholder="Szukaj po loginie GitHub…"
        selects={[
          {
            value: typeFilter,
            onValueChange: (value) => {
              setTypeFilter(value);
              updateUrl({ type: value, page: 1 });
            },
            placeholder: "Typ",
            options: [
              { value: "all", label: "Wszystkie" },
              ...Object.entries(typeLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ],
            className: "md:w-44",
          },
        ]}
      />
      <Select
        value={String(pageSize)}
        onValueChange={(value) => {
          setPageSize(Number(value));
          updateUrl({ pageSize: value, page: 1 });
        }}
      >
        <SelectTrigger className="w-full md:w-36">
          <SelectValue placeholder="Na stronę" />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} / stronę
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
