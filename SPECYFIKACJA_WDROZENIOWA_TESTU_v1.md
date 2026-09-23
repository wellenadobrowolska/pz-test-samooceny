# Test samooceny Pracowni Życia — specyfikacja wdrożeniowa v1

**Status:** wersja robocza do wdrożenia  
**Data:** 2026-08-28  
**Produkt docelowy:** publiczny test samooceny Pracowni Życia prowadzący do 30-dniowego programu Wellena  
**Zatwierdzony adres wdrożenia:** `test-samooceny.pracowniazycia.pl`

> **Aktualizacja — 2026-09-23:** Aktualny kod `POST /api/leads` dodaje e-mail
> do skonfigurowanej grupy MailerLite. Wymaga `MAILERLITE_API_KEY` i
> `MAILERLITE_GROUP_ID` w Vercel oraz nowego wdrożenia po ich zmianie. Wynik i
> ćwiczenie są tylko na ekranie; nie są wysyłane e-mailem. Wcześniejsza
> integracja arkusza pozostaje opisana w `integrations/google-sheets/README.md`.

## 1. Cel

Celem jest uruchomienie lekkiej, dostępnej aplikacji internetowej, która:

1. pozwala wypełnić 10-pytaniowy test w 2–3 minuty;
2. oblicza wynik zgodnie z mechaniką `self-esteem-v2`;
3. po podaniu adresu e-mail pokazuje wynik na tej samej stronie i wysyła jego kopię e-mailem;
4. daje krótką wartość edukacyjną i ćwiczenie do wielokrotnego użycia;
5. naturalnie prowadzi do prezentacji 30-dniowego programu Wellena;
6. mierzy przejście przez lejek bez wysyłania odpowiedzi, wyniku ani danych osobowych do systemu analitycznego.

## 2. Hierarchia źródeł

W razie rozbieżności obowiązuje następująca kolejność:

1. niniejszy dokument — zatwierdzone decyzje dotyczące przebiegu, prezentacji wyniku i architektury;
2. `TEST_SAMOOCENY_MECHANIKA_v2.md` — aktualna treść pytań, kolejność, odpowiedzi, punktacja i testy mechaniki;
3. `TONE_OF_VOICE_WELLENA_PZ_v2_1.md` — język komunikacji;
4. `BRAND_GUIDELINES_WELLENA_PZ_v11.md` — kolory, typografia i charakter wizualny;
5. `TEST SAMOOCENY PŻ.txt` i `WYNIK TESTU.txt` — materiały robocze do redakcji zgodnie z dokumentami nadrzędnymi.

## 3. Decyzje zatwierdzone

- Czas wypełnienia: **2–3 minuty**.
- Wynik jest prezentowany liczbowo jako **`{wynik} na 40`**.
- Ekran wyniku zawiera **neutralny wskaźnik kołowy**.
- Wskaźnik nie zawiera progów, kolorowych stref, etykiet „niski/średni/wysoki”, buziek ani oceny wyniku.
- Wskaźnik kołowy jest świadomie zatwierdzonym wyjątkiem od wcześniejszego roboczego zakazu wskaźników; nie może jednak przyjmować formy skali oceniającej.
- Nazwa skali Rosenberga nie pojawia się w treściach dla użytkowniczki.
- Wellena jest przedstawiana jako **30-dniowy program Pracowni Życia**.
- Pełny wynik pojawia się po podaniu adresu e-mail.
- Już przed rozpoczęciem testu należy jasno powiedzieć, że pełny wynik będzie dostępny po podaniu adresu e-mail.
- Test nie jest diagnozą ani narzędziem klinicznym.
- Pytania, ich kolejność i mechanika punktacji są wersjonowane jako `self-esteem-v2`; zmiany względem v1 są opisane w specyfikacji mechaniki v2.

## 4. Zakres MVP

### W zakresie

- landing i formularz wieloetapowy na jednej stronie;
- pierwsze pytanie widoczne w głównym obszarze strony;
- 10 obowiązkowych pytań;
- automatyczne przejście do następnego pytania po odpowiedzi;
- przycisk powrotu do poprzedniego pytania;
- numer pytania i pasek postępu;
- lokalne zachowanie odpowiedzi w przeglądarce;
- formularz e-mail po ostatnim pytaniu;
- obowiązkowa zgoda marketingowa z linkiem do polityki prywatności;
- obliczenie wyniku;
- ekran wyniku z neutralnym wskaźnikiem kołowym;
- mini-edukacja, ćwiczenie i CTA do Welleny;
- wysłanie kopii wyniku e-mailem;
- integracja z systemem newsletterowym;
- analityka lejka i pomiar przejścia do `wellena.pl`;
- pełna obsługa urządzeń mobilnych i klawiatury.

### Poza MVP

- konto użytkowniczki i logowanie;
- historia wielu pomiarów;
- panel administracyjny;
- przechowywanie odpowiedzi na serwerze;
- przechowywanie wyniku w bazie danych;
- porównywanie użytkowniczek, normy i percentyle;
- interpretacje „niska/średnia/wysoka samoocena”;
- personalizacja oparta na AI;
- płatności i zakup Welleny bezpośrednio w aplikacji testu.

## 5. Przebieg użytkowniczki

### 5.1. Wejście

Na pierwszym ekranie użytkowniczka widzi:

- nadawcę: Pracownia Życia;
- nazwę testu;
- krótką obietnicę wyniku, kontekstu i ćwiczenia;
- informację „2–3 minuty · bezpłatnie”;
- jasną informację, że pełny wynik będzie dostępny po podaniu e-maila;
- zastrzeżenie, że test nie jest diagnozą;
- instrukcję: „Odpowiadaj tak, jak jest dziś, nie tak, jak powinno być”;
- pierwsze pytanie i cztery odpowiedzi.

Nie dodajemy osobnego ekranu startowego, jeśli nie jest potrzebny do zgód analitycznych. Pierwsze pytanie ma możliwie szybko rozpocząć doświadczenie.

### 5.2. Pytania 1–10

- Jedno pytanie jest widoczne na ekranie w danym momencie.
- Wyświetlany jest tekst `Pytanie {n} z 10`.
- Pasek postępu pokazuje ukończoną część testu, ale nie sugeruje jakości wyniku.
- Żadna odpowiedź nie jest zaznaczona domyślnie.
- Po wyborze odpowiedzi następuje krótkie, spokojne przejście do kolejnego pytania bez przeładowania strony.
- Przycisk „Wstecz” pozwala wrócić i zmienić odpowiedź.
- Po powrocie wcześniej wybrana odpowiedź pozostaje zaznaczona.
- Na telefonie początek nowego pytania pozostaje widoczny; interfejs nie przewija użytkowniczki do całego początku landingu.

### 5.3. Bramka e-mail

Po odpowiedzi na pytanie 10 pojawia się komunikat:

> Twój wynik jest gotowy. Podaj e-mail, aby zobaczyć pełny wynik i otrzymać jego kopię.

Formularz zawiera:

- wymagane pole e-mail;
- link do polityki prywatności;
- informację, do czego adres zostanie użyty;
- osobny, domyślnie niezaznaczony i wymagany checkbox zgody marketingowej;
- przycisk „Pokaż mój wynik”.

Dokładne brzmienie informacji i zgody musi zostać zatwierdzone przed publikacją. Zgodnie z decyzją produktową zgoda marketingowa jest wymagana do wysłania i pokazania wyniku. Checkbox pozostaje domyślnie niezaznaczony, a w jego treści znajduje się link do polityki prywatności oraz informacja o możliwości wycofania zgody. Rozwiązanie wymaga weryfikacji prawnej przed publikacją ze względu na wymóg dobrowolności zgody.

### 5.4. Wynik

Po poprawnym przyjęciu formularza dotychczasowy układ testu zostaje zastąpiony pełnoekranowym ekranem wyniku. Ekran wygląda jak odrębna strona, ale pozostaje w tej samej karcie przeglądarki i pod tym samym adresem. Pojawiają się kolejno:

1. nagłówek `Twój wynik to {wynik} na 40`;
2. neutralny wskaźnik kołowy;
3. informacja, że jest to zapis dzisiejszych odpowiedzi, a nie ocena osoby;
4. zastrzeżenie, że test nie jest diagnozą;
5. mini-edukacja w dwóch odrębnych sekcjach;
6. trzyetapowe ćwiczenie „Potrafię / Mogę”;
7. prezentacja Welleny jako 30-dniowego programu Pracowni Życia z fotografią pokazującą przygotowanie do działania;
8. CTA `Zobacz, jak działa Wellena` prowadzące do `wellena.pl`.

Treści edukacyjne i ćwiczenie są wspólne dla wszystkich wyników. W MVP nie tworzymy różnych interpretacji na podstawie progów punktowych.

Po odświeżeniu ekran wyniku pozostaje widoczny w bieżącej sesji przeglądarki. Przycisk „Wypełnij test ponownie” usuwa wynik sesyjny i rozpoczyna nowe wypełnienie.

## 6. Wskaźnik kołowy

Wskaźnik jest wizualizacją liczby, nie oceną użytkowniczki.

### Zasady

- jeden kolor postępu: butelkowa zieleń `#3F5E5A`;
- neutralne tło pierścienia o odpowiednim kontraście;
- w środku czytelny zapis `{wynik} / 40`;
- brak czerwieni, żółci, zielonych stref i gradientów oceniających;
- brak progów i podpisów jakościowych;
- brak animacji przypominającej zdobywanie punktów;
- animacja wejścia, jeśli zostanie użyta, respektuje `prefers-reduced-motion`;
- dostępny tekst alternatywny: `Twój wynik: {wynik} na 40`;
- wynik musi pozostawać w pełni zrozumiały bez wskaźnika.

Ponieważ matematyczny zakres testu wynosi 10–40, długość łuku może być liczona jako `(wynik - 10) / 30`. Wartość liczbowa w środku zawsze pokazuje wynik oryginalny, np. `27 / 40`.

## 7. Pytania i odpowiedzi

Treść wszystkich 10 pytań należy skopiować dokładnie z `TEST_SAMOOCENY_MECHANIKA_v2.md`. Nie wolno jej przepisywać, skracać, poprawiać stylistycznie ani losować kolejności.

Odpowiedzi, zawsze w tej samej kolejności:

1. Zdecydowanie się nie zgadzam
2. Raczej się nie zgadzam
3. Raczej się zgadzam
4. Zdecydowanie się zgadzam

Wartości `1–4` są wewnętrzne i niewidoczne dla użytkowniczki.

## 8. Punktacja

### Pozycje wprost

Pytania `1, 3, 4, 7, 10`:

```text
punkty = odpowiedź
```

### Pozycje odwrócone

Pytania `2, 5, 6, 8, 9`:

```text
punkty = 5 - odpowiedź
```

Wynik jest sumą punktów i mieści się w zakresie `10–40`.

### Wymagania techniczne

- Punktacja jest czystą, deterministyczną funkcją.
- Moduł zawiera identyfikator wersji `self-esteem-v2`.
- Nie używa AI, losowości, wag, średnich ani zaokrągleń.
- Nie przyjmuje brakujących odpowiedzi ani wartości spoza `1–4`.
- Ten sam moduł ma być używany w publicznym teście i w przyszłym pomiarze wewnątrz Welleny.
- Jeśli aplikacje znajdują się w osobnych repozytoriach, moduł powinien być udostępniany jako wersjonowany prywatny pakiet albo pochodzić z jednego wspólnego monorepo.

### Testy obowiązkowe

Implementacja musi przejść T1–T6 z dokumentu mechaniki. Szczególnie:

- wszystkie odpowiedzi `4` dają wynik `25`;
- wszystkie odpowiedzi `1` dają wynik `25`;
- wszystkie odpowiedzi `2` dają wynik `25`.

## 9. Dane i prywatność

### Dane w przeglądarce

Odpowiedzi są przechowywane tymczasowo w `localStorage` pod kluczem zawierającym wersję testu. Dane lokalne:

- wygasają po 24 godzinach;
- są usuwane po poprawnym pokazaniu wyniku;
- nie zawierają adresu e-mail;
- nie są wysyłane do GA4 ani innego systemu analitycznego.

Po ukończeniu testu wyłącznie wynik liczbowy i wersja testu są tymczasowo przechowywane w `sessionStorage`, aby odświeżenie strony nie usuwało ekranu wyniku. Zapis:

- nie zawiera adresu e-mail ani pojedynczych odpowiedzi;
- znika po zamknięciu karty lub wybraniu „Wypełnij test ponownie”;
- nie jest umieszczany w adresie URL.

### Dane wysyłane do backendu

Endpoint wyniku przyjmuje wyłącznie:

- e-mail;
- wynik `10–40`;
- wersję testu;
- informację o zgodzie marketingowej;
- parametry źródła/UTM potrzebne do przypisania leada;
- token zabezpieczający formularz, jeśli ochrona zostanie włączona.

Nie wysyłamy ani nie zapisujemy pojedynczych odpowiedzi.

### Przechowywanie

- W MVP nie tworzymy własnej bazy danych.
- Wynik jest używany do wygenerowania ekranu i wiadomości e-mail, a następnie nie jest trwale zapisywany przez aplikację.
- Do narzędzia newsletterowego trafia e-mail po zaznaczeniu wymaganej zgody marketingowej.
- Do narzędzia newsletterowego nie przekazujemy wyniku, jeśli nie jest to konieczne do zatwierdzonej automatyzacji.
- Należy sprawdzić okres przechowywania treści i logów po stronie wybranego dostawcy poczty.

Dokument nie zastępuje przeglądu prawnego informacji, zgód, polityki prywatności i umów powierzenia danych.

## 10. Analityka

Rekomendowane zdarzenia:

- `self_assessment_view`
- `self_assessment_start`
- `self_assessment_question_view` z numerem pytania
- `self_assessment_complete`
- `self_assessment_email_submit`
- `self_assessment_result_view`
- `wellena_cta_click`

Nie wysyłamy do analityki:

- adresu e-mail;
- wartości pojedynczych odpowiedzi;
- wyniku;
- treści pól formularza;
- danych pozwalających odtworzyć profil psychologiczny.

`pracowniazycia.pl` i `wellena.pl` powinny korzystać z tego samego strumienia/tagu GA4 albo z uzgodnionej wspólnej konfiguracji. Obie domeny należy dodać do pomiaru między domenami i sprawdzić, czy parametr linkera nie ginie przy przekierowaniach.

## 11. Dostępność i UX

- Wszystkie odpowiedzi są prawdziwą grupą pól radiowych albo komponentem zachowującym pełną semantykę radiową.
- Cały test można przejść klawiaturą.
- Fokus jest widoczny i po zmianie pytania trafia w przewidywalne miejsce.
- Komunikaty błędów są powiązane z polami i ogłaszane czytnikom ekranu.
- Kontrast spełnia co najmniej WCAG AA.
- Klikalne obszary na telefonie mają wygodny rozmiar.
- Ruch i animacje respektują `prefers-reduced-motion`.
- Cofnięcie nie usuwa odpowiedzi.
- Odświeżenie strony nie usuwa niedokończonego testu przez maksymalnie 24 godziny.
- Brak sieci na etapie e-maila nie usuwa odpowiedzi; użytkowniczka może ponowić wysłanie.
- Wynik jest zrozumiały jako tekst bez koloru, wykresu i animacji.

## 12. Rekomendowana architektura

### Frontend i backend

Obecna strona `pracowniazycia.pl` działa na WordPressie/WooCommerce. Dla testu wybrano niezależną aplikację na subdomenie.

#### Wariant zatwierdzony

**Next.js z TypeScript jako osobna aplikacja na Vercel pod `test-samooceny.pracowniazycia.pl`.**

Uzasadnienie:

- test jest interaktywny i stanowy;
- ten sam projekt obsłuży stronę, endpoint e-mail i szablon wiadomości;
- nie trzeba utrzymywać osobnego serwera;
- aplikację łatwo wdrożyć na Vercel;
- kod domenowy punktacji pozostaje niezależny od komponentów interfejsu.

Ten wariant daje najczystsze oddzielenie aplikacji od WordPressa i najprostsze wdrożenia. Subdomena nadal pozostaje w domenie marki Pracowni Życia.

Proponowany podział:

```text
src/
  app/
    page.tsx
    api/result/route.ts
  components/self-assessment/
  domain/self-esteem-v2/
    questions.ts
    score.ts
    score.test.ts
    types.ts
  emails/
    self-assessment-result.tsx
  lib/
    analytics.ts
    mailing.ts
    validation.ts
```

#### Wariant odrzucony na etapie v1

Test można wdrożyć jako dedykowany moduł WordPressa: własną wtyczkę lub szablon strony z aplikacją React/TypeScript oraz bezpiecznym endpointem serwerowym.

W tym wariancie:

- kod nadal znajduje się w Git;
- aplikacja jest budowana automatycznie, a gotowy bundle trafia do wtyczki WordPress;
- WordPress obsługuje adres `/test-samooceny`;
- endpoint WordPress REST API albo osobna funkcja serwerowa obsługuje e-mail i integrację newsletterową;
- Vercel nie jest konieczny;
- aktualizacje wymagają kontrolowanego wdrożenia wtyczki na hosting WordPressa.

Nie rekomendujemy osadzania kompletnej aplikacji Vercel w `iframe`, ponieważ komplikuje dostępność, analitykę, responsywność i komunikację między stroną a formularzem.

### Hosting i adres testu

**Vercel — rekomendowany, ale nie wymagany technologicznie.**

Zapewni:

- hosting aplikacji;
- automatyczne wdrożenia;
- adresy podglądowe dla zmian;
- funkcję serwerową do przyjęcia formularza i wysłania e-maila;
- podpięcie subdomeny przez DNS;
- bezpieczne przechowywanie sekretów jako zmiennych środowiskowych.

Jeśli obecny hosting Pracowni Życia poprawnie obsługuje aplikacje Node.js i automatyczne wdrożenia, Vercel nie jest konieczny. Dla osobnej, lekkiej aplikacji będzie jednak najprostszym wariantem.

Zatwierdzony wariant to niezależna aplikacja Next.js/Vercel pod adresem `test-samooceny.pracowniazycia.pl`. Wariant WordPress i reverse proxy nie wchodzą do zakresu v1.

Wdrożenie pod ścieżką nie polega wyłącznie na zmianie DNS, ponieważ DNS działa dla domen i subdomen, a nie dla pojedynczych ścieżek URL. Wymaga wsparcia obecnego hostingu, reverse proxy, CDN albo przeniesienia odpowiedniego routingu. Subdomena może zostać podpięta do Vercel prostym rekordem CNAME.

### Baza danych

**Supabase — nie jest potrzebny w MVP.**

Brak kont, historii pomiarów, panelu administracyjnego i trwałego zapisu odpowiedzi oznacza, że baza danych nie rozwiązuje obecnie żadnej koniecznej potrzeby.

Supabase należy rozważyć później, jeśli pojawi się przynajmniej jedna z potrzeb:

- logowanie użytkowniczek;
- historia i porównanie wielu pomiarów;
- trwały zapis wyników;
- panel administracyjny;
- raportowanie na własnych danych;
- połączenie wyników z kontem Welleny;
- bezpieczny dostęp do danych według ról.

### E-mail i newsletter

Potrzebne są dwie funkcje, nawet jeśli obsłuży je jeden dostawca:

1. wysłanie kopii wyniku;
2. zapis do listy/sekwencji marketingowej po zaznaczeniu wymaganej zgody.

Możliwe warianty:

- istniejący system newsletterowy, jeśli ma API i potrafi wysłać wiadomość z wynikiem;
- system newsletterowy do listy oraz osobny dostawca poczty transakcyjnej, np. Resend, do kopii wyniku.

Integracja powinna znajdować się wyłącznie po stronie serwera. Klucze API nie mogą trafić do kodu przeglądarki.

### Ochrona formularza

Na start:

- walidacja po stronie klienta i serwera;
- pole-pułapka dla prostych botów;
- ograniczenie częstotliwości wywołań endpointu;
- idempotency key zapobiegający wielokrotnej wysyłce tego samego e-maila.

Jeśli pojawi się spam lub nadużycie, należy dodać Cloudflare Turnstile i obowiązkowo weryfikować token po stronie serwera.

## 13. Git i sposób wdrażania

**Git nie jest wymagany, aby uruchomić stronę, ale jest wymagany operacyjnie dla tego projektu.**

Repozytorium powinno być prywatne i hostowane np. na GitHubie. Git daje:

- historię zmian i możliwość cofnięcia błędu;
- kontrolę nad zamrożoną treścią pytań i wersją punktacji;
- automatyczne testy mechaniki;
- osobny podgląd każdej zmiany przed publikacją;
- automatyczne wdrożenie produkcyjne po zaakceptowaniu zmian;
- bezpieczniejszą współpracę z programistą.

Rekomendowany model:

- gałąź `main` jest produkcją;
- każda większa zmiana powstaje na osobnej gałęzi;
- Vercel tworzy podgląd zmiany;
- po testach zmiana trafia do `main` i jest automatycznie publikowana.

## 14. Konta i dostępy potrzebne do uruchomienia

### Konieczne

- prywatne repozytorium GitHub albo inny hosting Git;
- konto Vercel lub równoważny hosting;
- dostęp do DNS domeny `pracowniazycia.pl`;
- dostęp do konfiguracji hostingu, CDN lub reverse proxy głównej strony, jeśli wybieramy wariant `pracowniazycia.pl/test-samooceny`;
- skrzynka/domena nadawcza do e-maili;
- dostawca wysyłki e-maili;
- dostęp do obecnego systemu newsletterowego i jego API;
- dostęp do GA4/GTM oraz mechanizmu zgód cookies;
- adres polityki prywatności;
- docelowy adres landing page Welleny.

### Opcjonalne na start

- Cloudflare Turnstile;
- narzędzie monitorowania błędów, np. Sentry;
- Supabase;
- oddzielny CMS;
- panel administracyjny.

## 15. Zmienne środowiskowe

Orientacyjny zestaw:

```text
APP_URL=
RESULT_EMAIL_FROM=
TRANSACTIONAL_EMAIL_API_KEY=
MAILING_API_KEY=
MAILING_LIST_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
TURNSTILE_SITE_KEY=        # opcjonalne
TURNSTILE_SECRET_KEY=      # opcjonalne
```

Sekrety nie mogą być commitowane do Git ani udostępniane w kodzie przeglądarki.

## 16. Testy i kryteria odbioru

### Automatyczne

- testy punktacji T1–T6;
- odrzucenie niepełnych odpowiedzi;
- odrzucenie wartości spoza `1–4`;
- walidacja wyniku po stronie endpointu;
- test powrotu i zmiany odpowiedzi;
- test zachowania stanu po odświeżeniu;
- test formularza e-mail;
- test zablokowania wysłania formularza bez zgody marketingowej;
- test pojedynczej wysyłki przy ponowieniu żądania;
- test najważniejszego przebiegu w przeglądarce.

### Ręczne

- telefon, tablet i desktop;
- Chrome, Safari, Firefox i Edge;
- przejście całego testu klawiaturą;
- czytnik ekranu w podstawowym przebiegu;
- brak sieci na etapie formularza e-mail;
- kliknięcie CTA i zachowanie pomiaru między domenami;
- poprawność treści wiadomości w najpopularniejszych klientach pocztowych;
- brak wyniku i odpowiedzi w narzędziach analitycznych;
- poprawność polityki prywatności, zgód i linków.

## 17. Etapy wdrożenia

### Etap 1 — fundament

- założenie Git;
- utworzenie prywatnego repozytorium;
- utworzenie aplikacji Next.js/TypeScript;
- konfiguracja testów i Vercel Preview;
- implementacja zamrożonych pytań i modułu punktacji;
- testy T1–T6.

### Etap 2 — doświadczenie testu

- layout marki;
- pytania, cofanie, postęp i zapis lokalny;
- pełna obsługa mobile i klawiatury;
- prototyp ekranu wyniku ze wskaźnikiem kołowym.

### Etap 3 — e-mail

- formularz i walidacja;
- endpoint serwerowy;
- kopia wyniku;
- integracja newsletterowa;
- obsługa błędów i ponowień;
- zabezpieczenie przed nadużyciem.

### Etap 4 — analityka i domeny

- zdarzenia lejka;
- mechanizm zgód;
- cross-domain GA4;
- konfiguracja subdomeny `test-samooceny.pracowniazycia.pl`;
- weryfikacja adresu nadawcy i DNS pocztowego.

### Etap 5 — QA i publikacja

- testy automatyczne i ręczne;
- przegląd treści;
- przegląd dostępności;
- przegląd prywatności;
- test wysyłki i analityki na produkcji;
- publikacja.

## 18. Otwarte informacje potrzebne przed integracjami

Nie blokują implementacji mechaniki i interfejsu, ale są konieczne przed publikacją:

1. Jaki system newsletterowy jest obecnie używany?
2. Z jakiego adresu i domeny ma przychodzić kopia wyniku?
3. Jaki jest zatwierdzony tekst zgody i informacji o przetwarzaniu danych?
4. Jaki jest aktualny adres polityki prywatności?
5. Jaki będzie ostateczny adres strony Welleny?
6. Czy istnieje brakujący dokument `SYSTEM_WIZUALNY_STRONY_PZ_v1.md` lub `ZASADY_UI_STRONY_PZ`?
