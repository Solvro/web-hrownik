import writeXlsxFile from "write-excel-file/node";

/**
 * Synthetic Eventownik v3 participant export: the real column layout of a
 * recruitment edition (participantUuid, email, then form attributes in form
 * order) with made-up people. Every awkward case the importer has to handle
 * appears at least once — see the notes next to each participant.
 */
export const eventownikHeaders = [
  "participantUuid",
  "email",
  "Imię",
  "Nazwisko",
  "Indeks",
  "Kierunek",
  "Wydział",
  "Rok i stopień",
  "Opisz swoje kluczowe kompetencje związane z obszarami, w których chciałbyś/chciałabyś się rozwijać w Solvro. Jakie masz doświadczenie w tych dziedzinach? Z jakich technologii, narzędzi i rozwiązań korzystasz?",
  "Podziel się swoimi innymi pasjami i zainteresowaniami. Czy udzielasz się w innych kołach naukowych, pracujesz zawodowo, uczestniczysz w projektach naukowych lub działasz jako wolontariusz? Opowiedz o tym.",
  "Link do GitHub albo portfolio",
  "Zadanie rekrutacyjne",
  "Termin rozmowy",
  "Wolne myśli",
  "Facebook",
  "GitHub",
  "Discord",
  "Sekcje",
  "Wstępny wybór sekcji",
  "Sekcja na rozmowę",
  "Sekcja ostateczna",
  // A second form attribute with the same name — Eventownik adds the uuid.
  "Discord (7c9e6679-7425-40de-944b-e07fc1f90ae7)",
] as const;

type Header = (typeof eventownikHeaders)[number];
type Participant = Partial<Record<Header, string>>;

const competences = eventownikHeaders[8];
const passions = eventownikHeaders[9];

export const eventownikParticipants: Participant[] = [
  {
    // Row 2 — the happy path.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000001",
    email: "100001@student.pwr.edu.pl",
    Imię: "Anna",
    Nazwisko: "Testowa",
    Indeks: "100001",
    Kierunek: "Informatyka Stosowana",
    Wydział: "W4",
    "Rok i stopień": "2 rok, I stopień",
    [competences]: "TypeScript, NestJS, PostgreSQL; trochę Dockera.",
    [passions]: "Wspinaczka i planszówki.",
    "Link do GitHub albo portfolio": "https://github.com/anna-testowa",
    "Zadanie rekrutacyjne": "https://github.com/anna-testowa/zadanie",
    "Termin rozmowy": "5d3c6a4e-0000-4000-8000-00000000aaaa",
    "Wolne myśli": "Do zobaczenia na rozmowie!",
    Facebook: "https://www.facebook.com/anna.testowa.example",
    GitHub: "https://github.com/anna-testowa",
    Discord: "anna_testowa",
    Sekcje: "Backend",
    "Wstępny wybór sekcji": "Backend; Frontend",
    "Sekcja na rozmowę": "Backend",
    "Sekcja ostateczna": "Backend",
  },
  {
    // Row 3 — two final sections incl. "AI/ML", non-university e-mail,
    // bare GitHub username, Discord profile link with a numeric ID.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000002",
    email: "Bartek.Przykladowy@Example.com",
    Imię: "Bartłomiej",
    Nazwisko: "Przykładowy",
    Indeks: "100002",
    Kierunek: "matematyka stosowana i sztuczna inteligencja",
    Wydział: "W13",
    "Rok i stopień": "1 rok, I stopień",
    "Link do GitHub albo portfolio": "https://github.com/bartek-p",
    "Termin rozmowy": "5d3c6a4e-0000-4000-8000-00000000bbbb",
    Facebook: "https://facebook.com/profile.php?id=100000000000002",
    GitHub: "bartek-p",
    Discord: "https://discord.com/users/123456789012345678",
    Sekcje: "AI/ML",
    "Wstępny wybór sekcji": "AI/ML; Backend",
    "Sekcja na rozmowę": "AI/ML",
    "Sekcja ostateczna": "AI/ML; Backend",
  },
  {
    // Row 4 — applied but not accepted (no final section).
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000003",
    email: "100003@student.pwr.edu.pl",
    Imię: "Celina",
    Nazwisko: "Odrzucona",
    Indeks: "100003",
    Kierunek: "Teleinformatyka",
    Wydział: "W4",
    "Rok i stopień": "1 rok, I stopień",
    "Wstępny wybór sekcji": "Mobile",
    "Sekcja na rozmowę": "NIE",
    "Discord (7c9e6679-7425-40de-944b-e07fc1f90ae7)": "celina.o",
  },
  {
    // Row 5 — department "Inny", invalid index, GitHub only in the
    // portfolio column (no scheme), "@" Discord handle, Facebook given as a
    // name instead of a link, "UI/UX Design" stored as "UI/UX" in HRownik.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000004",
    email: "dawid.spoza@example.org",
    Imię: "Dawid",
    Nazwisko: "Spoza",
    Indeks: "12345",
    Kierunek: "Kognitywistyka",
    Wydział: "Inny",
    "Rok i stopień": "3 rok, I stopień",
    "Link do GitHub albo portfolio": "github.com/dawid-spoza",
    Facebook: "Dawid Spoza",
    Discord: "@dawid.spoza",
    "Sekcja ostateczna": "UI/UX Design",
  },
  {
    // Row 6 — second-cycle studies with an English-taught field spelled
    // differently than ToPWR, a Discord server invite instead of a user,
    // a non-GitHub link in the GitHub column and a section HRownik lacks.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000005",
    email: "100005@student.pwr.edu.pl",
    Imię: "Ewa",
    Nazwisko: "Magisterska",
    Indeks: "100005",
    Kierunek: "Informatyka stosowana w języku angielskim",
    Wydział: "W4",
    "Rok i stopień": "1 rok, II stopień",
    "Link do GitHub albo portfolio": "https://ewa-portfolio.example.com",
    Facebook: "https://www.facebook.com/ewa.magisterska.example",
    GitHub: "https://share.example.com/ewa",
    Discord: "https://discord.gg/abcDEF",
    "Sekcja ostateczna": "Project Management; Robotyka",
  },
  {
    // Row 7 — a typo in the field of study, fourth year.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000006",
    email: "100006@student.pwr.edu.pl",
    Imię: "Filip",
    Nazwisko: "Literówka",
    Indeks: "100006",
    Kierunek: "Infromatyka algorytmiczna",
    Wydział: "W4",
    "Rok i stopień": "4 rok, I stopień",
    "Link do GitHub albo portfolio": "https://github.com/filip-literowka",
    GitHub: "https://github.com/filip-literowka/",
    Discord: "filip_l",
    Facebook: "https://www.facebook.com/filip.literowka.example",
    "Sekcja ostateczna": "DevOps",
  },
  {
    // Row 8 — field given as an abbreviation, unrecognisable year,
    // "Promotion" stored as "Promocja" in HRownik.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000007",
    email: "100007@student.pwr.edu.pl",
    Imię: "Grzegorz",
    Nazwisko: "Skrótowy",
    Indeks: "100007",
    Kierunek: "IST",
    Wydział: "W4",
    "Rok i stopień": "5 rok, I stopień",
    "Link do GitHub albo portfolio": "https://github.com/grzegorz-skrotowy",
    GitHub: "https://github.com/grzegorz-skrotowy",
    Discord: "grzesiek_s",
    Facebook: "https://www.facebook.com/grzegorz.skrotowy.example",
    "Sekcja ostateczna": "Promotion",
  },
  {
    // Row 9 — the person from row 2 registered a second time, not accepted.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000008",
    email: "100001@student.pwr.edu.pl",
    Imię: "Anna",
    Nazwisko: "Testowa",
    Indeks: "100001",
    Kierunek: "Informatyka Stosowana",
    Wydział: "W4",
    "Rok i stopień": "2 rok, I stopień",
  },
  {
    // Row 10 — accepted, but the e-mail is broken: must be fixed (or the
    // row unticked) before the import can be submitted.
    participantUuid: "0b6f6c1e-1a2b-4c3d-8e9f-000000000009",
    email: "hanna.brakmaila@",
    Imię: "Hanna",
    Nazwisko: "Brakmaila",
    Indeks: "100009",
    Kierunek: "Informatyka techniczna",
    Wydział: "W4",
    "Rok i stopień": "3 rok, I stopień",
    GitHub: "https://github.com/hanna-b",
    Discord: "hanna_b",
    Facebook: "https://www.facebook.com/hanna.brakmaila.example",
    "Sekcja ostateczna": "Frontend",
  },
];

export function eventownikTable(
  headers: readonly string[] = eventownikHeaders,
  participants: Participant[] = eventownikParticipants,
): string[][] {
  return [
    [...headers],
    ...participants.map((participant) =>
      eventownikHeaders.map((header) => participant[header] ?? ""),
    ),
  ];
}

/** Builds an in-memory .xlsx file, the way the browser would upload it. */
export async function xlsxFile(
  table: string[][],
  name = "participants.xlsx",
): Promise<File> {
  const buffer = await writeXlsxFile(
    table.map((row) => row.map((value) => (value === "" ? null : value))),
  ).toBuffer();
  return new File([new Uint8Array(buffer)], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
