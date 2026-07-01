"use client";

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
      <Input
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
        placeholder={queryPlaceholder}
        className="min-w-0 md:flex-1"
      />
      {selects.map((select) => (
        <Select
          key={select.placeholder}
          value={select.value}
          onValueChange={select.onValueChange}
        >
          <SelectTrigger className={cn("w-full md:w-44", select.className)}>
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
