import { env } from "@/env";

const TOPWR_REVALIDATE_SECONDS = 60 * 60 * 24;

export interface TopwrFieldOfStudy {
  id: number;
  departmentId: number;
  name: string;
  studiesType: string;
}

export interface TopwrDepartment {
  id: number;
  name: string;
  code: string;
  fieldsOfStudy?: TopwrFieldOfStudy[];
}

interface TopwrDepartmentsResponse {
  data: TopwrDepartment[];
}

export interface UniversityInfoOptions {
  departments: { id: string; value: string; label: string; code: string }[];
  fieldsOfStudy: {
    id: string;
    value: string;
    label: string;
    name: string;
    department: string;
    studiesType: string;
  }[];
}

export async function getUniversityInfoOptions(): Promise<UniversityInfoOptions> {
  const url = new URL("/api/v1/departments", env.TOPWR_API_BASE_URL);
  url.searchParams.set("fieldsOfStudy", "true");

  const response = await fetch(url, {
    next: {
      revalidate: TOPWR_REVALIDATE_SECONDS,
      tags: ["topwr-university-info"],
    },
  });

  if (!response.ok) {
    throw new Error("Nie udało się pobrać danych wydziałów z ToPWR.");
  }

  const payload = (await response.json()) as TopwrDepartmentsResponse;
  return toUniversityInfoOptions(payload.data);
}

/**
 * For flows that work without study data (the recruitment import): empty
 * options instead of an error when ToPWR is unreachable.
 */
export async function getUniversityInfoOptionsOrEmpty(): Promise<UniversityInfoOptions> {
  try {
    return await getUniversityInfoOptions();
  } catch (error) {
    console.warn("ToPWR is unavailable, continuing without study data:", error);
    return { departments: [], fieldsOfStudy: [] };
  }
}

export function toUniversityInfoOptions(
  data: TopwrDepartment[],
): UniversityInfoOptions {
  const departments = data.map((department) => ({
    id: String(department.id),
    value: department.name,
    label: `${department.code} · ${department.name}`,
    code: department.code,
  }));
  const fieldsOfStudy = data.flatMap((department) =>
    (department.fieldsOfStudy ?? []).map((field) => ({
      id: String(field.id),
      value: formatFieldOfStudy(field, department),
      label: formatFieldOfStudy(field),
      name: field.name,
      department: department.name,
      studiesType: field.studiesType,
    })),
  );

  return { departments, fieldsOfStudy };
}

function formatFieldOfStudy(
  field: TopwrFieldOfStudy,
  department?: TopwrDepartment,
): string {
  if (department !== undefined) {
    return `${field.name} (${formatStudiesType(field.studiesType)}, ${department.code})`;
  }
  return `${field.name} (${formatStudiesType(field.studiesType)})`;
}

function formatStudiesType(studiesType: string): string {
  if (studiesType === "1DEGREE") {
    return "I stopień";
  }
  if (studiesType === "2DEGREE") {
    return "II stopień";
  }
  if (studiesType === "LONG_CYCLE") {
    return "jednolite";
  }
  return studiesType;
}
