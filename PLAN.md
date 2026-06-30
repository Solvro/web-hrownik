# HRownik

## Features

### lifecycle członków

1. rekrutacja

- pobieranie zgłoszeń z eventownika

2. onboarding - zbieranie danych: imie+nazwisko, discord, facebook, github, indeks (jeśli jest studentem), adres(y) email (do powiadomien lub do logowania, np. przez Solvro Auth), dane studiów, sekcje (wiele), role (wiele), komentarz/bio (np. wiceprezes ds. technologii)
   automatyczne zapraszanie do discorda, githuba, grupki

3. każdy członek ma własną stronę/profil: githubowy timeline z aktywnością na wszystkich repozytoriach Solvro, z rozgraniczeniem na poszczególne projekty (zobacz poniżej). na stronie jest też timeline/historia ról członka: np jak na linkedinie widać progres kariery z członka, do techleada, do przewodniczącego sekcji itp., z rozpisanymi datami objęcia danego stanowiska. Role wyświetlają też powiązane zasoby, do których można przejść linkiem: patrz poniżej.

### Role członków

Rola jest powiązana do jednej z poniższych.

a. sekcja - np. przewodniczący, wiceprzewodniczący, członek
b. projekt - np. techlead, PM, PO, programista, UI/UX designer
c. zarząd - np. prezes, wiceprezes, sekretarz

#### uprawnienia

członkowie w zarządzie mają dostęp do HRownika w całości - mogą tworzyć i zarządzać projektami, członkami i ich powiązaniami.
kierownicy projektu (techlead, PM, PO) mają dostęp do HRownika tylko dla projektów, których są kierownikami - mogą zarządzać członkami i zespołami w projekcie.
członkowie pozostali mogą się logować do HRownika i zarządzać własnymi danymi (w ograniczonym stopniu - np tylko zmiana sociali i danych studiów, czyli kierunek, indeks, rok i semestr studiów) lub wyświetlać wszystkie pozostałe dane.

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

każdy zespół zawiera członków. w momencie zmiany w członkach zespołu, członkom przyznawane są przynależności do teamu na GitHubie i nadawane są odpowiednie role na Discordzie. W momencie usunięcia członka - proces odwrotny.

#### zakończenie projektu

w momencie zmiany statusu projektu na zakończony, wkracza procedura kończąca projekt. Dodane jest pole 'sprawozdanie projektu', które ma być linkiem do dokumentu na Google drive. kierownicy projektów są przypisani do nowego taska w ogólnym projekcie GitHubowym 'KN Solvro': "wypełnij sprawozdanie projektu". są cztery kroki: utwórz dokument w katalogu projektu na google drive, wklej link do dokumentu w HRowniku, uzupełnij sprawozdanie, przekaż sprawozdanie do akceptajci przez Zarząd.
