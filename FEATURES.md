# HRownik

## Features

HRownik ma być wewnętrznym systemem operacyjnym koła: źródłem prawdy o członkach,
sekcjach, projektach, aktywności technicznej, wiedzy organizacyjnej, finansach i
spotkaniach zarządu. Obecny stan repo obejmuje moduły członków, sekcji, projektów,
podpiętych repozytoriów GitHub, aktywności GitHub, uprawnień oraz podstawowego
logowania. Kolejne moduły powinny rozwijać ten sam model: mniej rozproszonych
arkuszy, więcej danych utrzymywanych bezpośrednio w HRowniku.

### lifecycle członków

1. rekrutacja

- pobieranie zgłoszeń z Eventownika,
- import zaakceptowanych kandydatów do onboardingu członka,
- docelowo ograniczenie ręcznego przepisywania danych z formularzy i arkuszy.

2. onboarding - zbieranie danych: imię i nazwisko, Discord, Facebook, GitHub, indeks (jeśli jest studentem), adresy e-mail do logowania i powiadomień, dane studiów, sekcje, role organizacyjne/sekcyjne, status członka oraz komentarz/bio (np. wiceprezes ds. technologii).

- automatyczne zapraszanie do Discorda i GitHuba,
- docelowe podpięcie „grupki” po doprecyzowaniu integracji,
- możliwość importu członków z danych tabelarycznych na potrzeby migracji.

3. każdy członek ma własną stronę/profil: githubowy timeline z aktywnością na wszystkich repozytoriach Solvro, z rozgraniczeniem na poszczególne projekty. Na stronie są osobne historie:

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

logowanie do HRownika odbywa się przez zaufane platformy autoryzacyjne, np. USOS przez better-auth-usos, lub przez Solvro Auth (własny self-hostowany Keycloak). Jeśli użytkownik loguje się przez USOS, członek jest ustalany przez indeks albo adres e-mail studencki zawierający indeks. Jeśli loguje się przez Solvro Auth, konto jest wiązane przez e-maile członka. Email/password zostaje jako fallback do kont bootstrapowych, dopóki zarząd nie zdecyduje inaczej.

### lifecycle projektu

projekt ma atrybuty: status (aktywny, zakończony, zawieszony), publiczność (wewnętrzny, publiczny), link produkcyjny do aplikacji oraz slug.

mają być pola do wklejenia linku do folderu projektu na Google Drive oraz linku do karty projektu.

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

w momencie zmiany statusu projektu na zakończony, wkracza procedura kończąca projekt. Dodane jest pole „sprawozdanie projektu”, które ma być linkiem do dokumentu na Google Drive. Kierownicy projektów są przypisani do nowego taska w ogólnym projekcie GitHubowym „KN Solvro”: „wypełnij sprawozdanie projektu”. Są cztery kroki: utwórz dokument w katalogu projektu na Google Drive, wklej link do dokumentu w HRowniku, uzupełnij sprawozdanie, przekaż sprawozdanie do akceptacji przez zarząd.

### knowledge management

HRownik powinien stopniowo przejmować rolę wewnętrznej bazy wiedzy koła, żeby informacje organizacyjne nie ginęły w prywatnych notatkach, losowych dokumentach i rozmowach.

1. Baza wiedzy organizacyjnej:

- dokumenty i notatki opisujące procesy koła, np. onboarding, prowadzenie projektu, przekazywanie sekcji, zasady korzystania z GitHuba/Discorda/Drive'a,
- kategorie lub tagi, np. zarząd, sekcje, projekty, finanse, rekrutacja, wydarzenia,
- wyszukiwanie po tytule i treści,
- widoczność zależna od uprawnień: część wiedzy publiczna dla wszystkich członków, część tylko dla zarządu albo kierowników projektów,
- historia zmian albo przynajmniej informacja, kto i kiedy ostatnio edytował dokument.

2. Wiedza projektowa:

- każdy projekt może mieć własne notatki, decyzje i linki do dokumentów,
- kierownicy projektów mogą utrzymywać dokumentację swojego projektu,
- zarząd ma dostęp do całości, żeby zachować ciągłość po zmianie składu zespołu.

### finanse projektów i budżet organizacji

HRownik powinien zastąpić małe, rozproszone Excelki używane do planowania i śledzenia budżetów. Nie chodzi tylko o przechowywanie linków do arkuszy, ale o możliwość rozpisywania wydatków, wpływów i planu budżetowego bezpośrednio w aplikacji.

1. Budżet całego koła:

- centralny widok budżetu organizacji,
- planowane i rzeczywiste wpływy, np. granty, sponsorzy, środki uczelniane, zwroty,
- planowane i rzeczywiste wydatki, np. infrastruktura, wydarzenia, materiały, delegacje, merch,
- kategorie finansowe, daty, opisy, kwoty, statusy i załączniki/linki do faktur lub dokumentów,
- podsumowania: plan, wykonanie, różnica, dostępne środki,
- widoczność i edycja przede wszystkim dla zarządu albo osób odpowiedzialnych za finanse.

2. Budżety projektów:

- każdy projekt może mieć własny budżet projektowy,
- kierownicy projektów mogą edytować budżet tylko swoich projektów,
- zarząd widzi i edytuje wszystkie budżety projektowe,
- wpisy budżetowe obejmują planowane i rzeczywiste wydatki oraz wpływy,
- możliwość oznaczania pozycji jako planowana, zaakceptowana, poniesiona, rozliczona albo odrzucona,
- projektowy budżet powinien dać się porównać z budżetem całego koła, żeby zarząd widział sumaryczne zobowiązania i realne koszty projektów.

### agendy i spotkania zarządowe

HRownik powinien wspierać przygotowanie i prowadzenie spotkań zarządu oraz utrzymywać historię decyzji.

1. Spotkania zarządu:

- lista spotkań z datą, uczestnikami, statusem i opisem,
- agenda spotkania jako lista punktów do omówienia,
- możliwość przypisania punktów agendy do osoby odpowiedzialnej,
- notatki i decyzje po spotkaniu,
- action itemy z właścicielem, terminem i statusem.

2. Logowanie obecności i aktywności zarządu:

- możliwość oznaczania, kto pojawił się na spotkaniu strategicznym lub zarządowym,
- historia obecności przy profilu członka zarządu,
- rozróżnienie spotkań strategicznych, operacyjnych i innych typów spotkań, jeśli będzie potrzebne,
- raport dla zarządu pokazujący frekwencję, otwarte action itemy i decyzje wymagające follow-upu.
