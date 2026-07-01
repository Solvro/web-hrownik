"use client";

import { Button } from "@/components/ui/button";
import type { ActivityRange } from "@/lib/activity-range";

export function ActivityRangePicker({
  selected,
  availableYears,
  onSelect,
}: {
  selected: ActivityRange;
  availableYears: number[];
  onSelect: (range: ActivityRange) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
      <Button
        type="button"
        size="xs"
        variant={selected.type === "last-year" ? "default" : "ghost"}
        onClick={() => {
          onSelect({ type: "last-year" });
        }}
        aria-pressed={selected.type === "last-year"}
        className="justify-start"
      >
        Ostatni rok
      </Button>
      {availableYears.map((year) => (
        <Button
          key={year}
          type="button"
          size="xs"
          variant={
            selected.type === "year" && year === selected.year
              ? "default"
              : "ghost"
          }
          onClick={() => {
            onSelect({ type: "year", year });
          }}
          aria-pressed={selected.type === "year" && year === selected.year}
          className="justify-start"
        >
          {year}
        </Button>
      ))}
    </div>
  );
}
