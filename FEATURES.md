# HRownik

## Features

### lifecycle członków

1. rekrutacja

- pobieranie zgłoszeń z eventownika

2. onboarding - zbieranie danych: imie+nazwisko, discord, facebook, github, indeks (jeśli jest studentem), adres(y) email (do powiadomien lub do logowania, np. przez Solvro Auth), dane studiów, sekcje (wiele), role organizacyjne/sekcyjne (wiele), status członka, komentarz/bio (np. wiceprezes ds. technologii)
   automatyczne zapraszanie do discorda, githuba, grupki

3. każdy członek ma własną stronę/profil: githubowy timeline z aktywnością na wszystkich repozytoriach Solvro, z rozgraniczeniem na poszczególne projekty (zobacz poniżej). na stronie są osobne historie:

- historia projektów: projekty i zespoły, w których członek był, rola w zespole projektu oraz daty `joined_at`/`left_at`,
- historia ról organizacyjnych i sekcyjnych: np. prezes, wiceprezes, sekretarz, przewodniczący sekcji, członek sekcji.

4. status członka jest jednym z: nowy, aktywny, nieaktywny, honorowy. Status honorowy jest informacyjny: taki członek nadal może mieć projekty, sekcje i role.

5. zarząd widzi i edytuje prywatne notatki HR członka, przeznaczone na migrację informacji z arkuszy typu doświadczenie zawodowe/PWr, hackathony, uwagi, retrospekcje i podobne konteksty. Pozostali użytkownicy nie powinni dostawać tej wartości w formularzach ani widoku profilu.

6. dane uczelniane:

- wydział jest wybierany z ToPWR API,
- kierunek studiów jest wybierany z ToPWR API,
- rok jest wybierany z listy: I inżynierski, II inżynierski, III inżynierski, IV inżynierski, I magisterski, II magisterski, doktorat,
- semestr nie jest osobnym polem.

Dane ToPWR są pobierane po stronie serwera przez konfigurowalny `TOPWR_API_BASE_URL` i cache'owane przez mechanizmy Next.js, nie przy otwieraniu selecta w przeglądarce.

### Role członków

Role są rozdzielone na dwa mechanizmy, żeby aplikacja była źródłem prawdy po migracji z Excela/Google Sheets.

1. Role organizacyjne i sekcyjne są w `role_assignment`:

- sekcja - np. przewodniczący, wiceprzewodniczący, członek,
- zarząd - np. prezes, wiceprezes, sekretarz.

2. Role projektowe są częścią członkostwa w zespole projektu (`team_member.role`), a nie `role_assignment`:

- np. PM, PO, techlead, TS, programista, UI/UX designer, członek zespołu,
- każdy wpis ma historię przez `joined_at` i `left_at`,
- strona członka pokazuje z tego historyczny timeline projektów.

#### uprawnienia

członkowie w zarządzie mają dostęp do HRownika w całości - mogą tworzyć i zarządzać projektami, członkami i ich powiązaniami.
kierownicy projektu (techlead, PM, PO, TS) mają dostęp do HRownika tylko dla projektów, których są kierownikami - mogą zarządzać członkami i zespołami w projekcie.
członkowie pozostali mogą się logować do HRownika i zarządzać własnymi danymi (w ograniczonym stopniu - np tylko zmiana sociali i danych studiów, czyli wydział, kierunek, indeks i rok) lub wyświetlać pozostałe dane nieprywatne.

logowanie do hrownika odbywa się przez zaufane platformy autoryzacyjne, np. USOS przez better auth usos plugin, lub przez Solvro Auth (nasz własny selfhostowany keycloak). jeśli przez USOS, to członek jest ustalany przez indeks (USOS udostępnia indeks oraz adres email studencki zawierający indeks), a jeśli prez Solvro Auth to przez powiązanie do emaili członka.

### lifecycle projektu

projekt ma atrybuty: status (np. aktywny, zakończony, zawieszony); publiczność (np. wewnętrzne, publiczne); linki produkcyjne dostepu do aplikacji

ma być pole do wklejenia link do foldera na google drive wraz z kartą projektu

#### repozytoria

projekt ma relacje do 1 lub wielu repozytoriów.

projekt ma możliwość połaczenia z projektem na GitHubie poprzez wybranie z listy projektów GitHubowych w dropdownie.

na stronie projektu jest ala githubowy timeline z agregowaną aktywnością na wszystkich repozytoriach danego projektu.

ranking członków żeby było widać kto najwięcej w projekcie pracuje - np top 5 w ostatnim tygodniu lub miesiącu.

wyklucz botów typu dependabot, github actions itp.

na stronie repozytorium jest podgląd issues i PR danego repo. wszystkie linki kierują do odpowiednich zasobów na GitHubie. są też opcje przypisywania członkom nowych tasków/issues, które linkują do projektu na GitHubie z prefillowaną akcją: czyli dodanie nowego issue w danym repo z określonym assignee.

#### szablony projektów

tworzenie nowego projektu: wybierasz istniejące lub nowe repozytoria. dla nowych repo można wybrać tech stack i po zatwierdzeniu wygenerują się repozytoria w organizacji Solvro z templatowanym projektem, najlepiej używając już solvro configa.

#### zespoły

projekt posiada zespoły: np. frontend, backend, devops

każdy zespół zawiera członków z konkretną rolą projektową. członkostwo w zespole jest historyczne: usunięcie członka ustawia datę zakończenia zamiast kasować rekord. w momencie zmiany w członkach zespołu, członkom przyznawane są przynależności do teamu na GitHubie i nadawane są odpowiednie role na Discordzie. W momencie zakończenia członkostwa - proces odwrotny.

#### zakończenie projektu

w momencie zmiany statusu projektu na zakończony, wkracza procedura kończąca projekt. Dodane jest pole 'sprawozdanie projektu', które ma być linkiem do dokumentu na Google drive. kierownicy projektów są przypisani do nowego taska w ogólnym projekcie GitHubowym 'KN Solvro': "wypełnij sprawozdanie projektu". są cztery kroki: utwórz dokument w katalogu projektu na google drive, wklej link do dokumentu w HRowniku, uzupełnij sprawozdanie, przekaż sprawozdanie do akceptajci przez Zarząd.
