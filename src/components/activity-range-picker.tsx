"use client";

import { Button } from "@/components/ui/button";
import type { ActivityRange } from "@/lib/activity-range";

function YearButton({
  year,
  selected,
  onSelect,
}: {
  year: number;
  selected: ActivityRange;
  onSelect: (range: ActivityRange) => void;
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={
        selected.type === "year" && selected.year === year ? "default" : "ghost"
      }
      onClick={() => {
        onSelect({ type: "year", year });
      }}
      aria-pressed={selected.type === "year" && selected.year === year}
      className="justify-start"
    >
      {year}
    </Button>
  );
}

export function ActivityRangePicker({
  selected,
  availableYears,
  onSelect,
}: {
  selected: ActivityRange;
  availableYears: number[];
  onSelect: (range: ActivityRange) => void;
}) {
  const [currentYear, ...olderYears] = availableYears;

  return (
    <div className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
      <YearButton year={currentYear} selected={selected} onSelect={onSelect} />
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
      {olderYears.map((year) => (
        <YearButton
          key={year}
          year={year}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
