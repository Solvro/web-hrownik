import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Form inputs use "" for "no value"; the database uses null. */
export function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}
