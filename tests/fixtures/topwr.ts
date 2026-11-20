import { toUniversityInfoOptions } from "@/lib/integrations/topwr";

// A slice of the public ToPWR /api/v1/departments?fieldsOfStudy=true response.
export const topwrSample = toUniversityInfoOptions([
  {
    id: 1,
    code: "W1",
    name: "Wydział Architektury",
    fieldsOfStudy: [
      { id: 2, departmentId: 1, name: "Architektura", studiesType: "1DEGREE" },
      { id: 4, departmentId: 1, name: "Architektura", studiesType: "2DEGREE" },
    ],
  },
  {
    id: 5,
    code: "W4",
    name: "Wydział Informatyki i Telekomunikacji",
    fieldsOfStudy: [
      {
        id: 26,
        departmentId: 5,
        name: "Cyberbezpieczeństwo",
        studiesType: "1DEGREE",
      },
      {
        id: 28,
        departmentId: 5,
        name: "Informatyka algorytmiczna",
        studiesType: "1DEGREE",
      },
      {
        id: 29,
        departmentId: 5,
        name: "Informatyka stosowana",
        studiesType: "1DEGREE",
      },
      {
        id: 30,
        departmentId: 5,
        name: "Informatyka stosowana w j. angielskim",
        studiesType: "1DEGREE",
      },
      {
        id: 31,
        departmentId: 5,
        name: "Informatyka techniczna",
        studiesType: "1DEGREE",
      },
      {
        id: 32,
        departmentId: 5,
        name: "Inżynieria systemów",
        studiesType: "1DEGREE",
      },
      {
        id: 33,
        departmentId: 5,
        name: "Teleinformatyka",
        studiesType: "1DEGREE",
      },
      {
        id: 37,
        departmentId: 5,
        name: "Informatyka algorytmiczna",
        studiesType: "2DEGREE",
      },
      {
        id: 38,
        departmentId: 5,
        name: "Informatyka stosowana",
        studiesType: "2DEGREE",
      },
      {
        id: 39,
        departmentId: 5,
        name: "Informatyka stosowana w j. angielskim",
        studiesType: "2DEGREE",
      },
      {
        id: 43,
        departmentId: 5,
        name: "Sztuczna inteligencja",
        studiesType: "2DEGREE",
      },
      {
        id: 138,
        departmentId: 5,
        name: "Sztuczna inteligencja",
        studiesType: "1DEGREE",
      },
    ],
  },
  {
    id: 14,
    code: "W13",
    name: "Wydział Matematyki",
    fieldsOfStudy: [
      {
        id: 126,
        departmentId: 14,
        name: "Matematyka i analiza danych",
        studiesType: "1DEGREE",
      },
      {
        id: 127,
        departmentId: 14,
        name: "Matematyka stosowana i sztuczna inteligencja",
        studiesType: "1DEGREE",
      },
      {
        id: 128,
        departmentId: 14,
        name: "Applied Mathematics",
        studiesType: "2DEGREE",
      },
    ],
  },
]);
