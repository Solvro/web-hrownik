"use client";

import { ArrowUpDown, Filter, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ListFilterSelect {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
  kind?: "filter" | "sort";
}

export function ListFilters({
  query,
  onQueryChange,
  queryPlaceholder,
  selects,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  selects: ListFilterSelect[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 md:flex md:items-center", className)}>
      <div className="relative min-w-0 md:flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder={queryPlaceholder}
          className="pl-9"
        />
      </div>
      {selects.map((select) => (
        <Select
          key={select.placeholder}
          value={select.value}
          onValueChange={select.onValueChange}
        >
          <SelectTrigger className={cn("w-full md:w-44", select.className)}>
            {select.kind === "sort" ? (
              <ArrowUpDown className="text-muted-foreground size-4" />
            ) : (
              <Filter className="text-muted-foreground size-4" />
            )}
            <SelectValue placeholder={select.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {select.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
