# Tymczasowy zapis adresów do prywatnego Arkusza Google

Po konfiguracji uczestniczka podaje e-mail i zaznacza zgodę. Serwer testu zapisuje zgłoszenie w Twoim prywatnym arkuszu, a po potwierdzeniu zapisu pokazuje wynik na stronie. Nie trzeba podłączać Google Drive do rozmowy ani przekazywać nikomu hasła do Google.

Ta integracja **nie wysyła wyniku ani ćwiczenia uczestniczce** i nie dodaje jej jeszcze do MailerLite. Zapisy zostają w arkuszu do późniejszego eksportu. Na stronie nie należy w tym okresie obiecywać dostarczenia wyniku e-mailem.

**Warunek uruchomienia:** kod integracji musi być wdrożony na Vercelu z obiema zmiennymi środowiskowymi opisanymi poniżej. Sama konfiguracja Google lub ponowne wdrożenie starszego kodu nie uruchamia zapisu. Działanie potwierdź testem odbiorowym: formularz → nowy wiersz w arkuszu → ekran wyniku.

## Co i gdzie się zapisuje

| Dane | Miejsce i sposób przechowywania |
| --- | --- |
| E-mail, data zapisu UTC, zgoda marketingowa, treść i wersja zgody, wersja testu, identyfikator zgłoszenia | Prywatna zakładka `Zapisy` w Twoim Arkuszu Google; bez automatycznej daty usunięcia — okres przechowywania ustalasz Ty |
| Odpowiedzi i miejsce przerwania testu | Tylko przeglądarka uczestniczki (`localStorage`), żeby odzyskać postęp po odświeżeniu; ważność 24 godziny od ostatniego zapisu, po upływie usuwane przy kolejnym odczycie, a po udanym zapisie e-maila czyszczone od razu |
| Wynik punktowy | Tylko pamięć sesji karty przeglądarki (`sessionStorage`), żeby odświeżenie nie wymagało ponownego podawania e-maila; nie trafia do arkusza |
| Sekret połączenia | Właściwości skryptu Google oraz ustawienia serwerowe Vercela; nigdy arkusz, GitHub ani kod przeglądarki |

Serwer Vercela przekazuje zgłoszenie do Google; nie tworzymy na nim dodatkowej bazy kontaktów. E-mail nie jest zapisywany w pamięci przeglądarki. Arkusz nie otrzymuje odpowiedzi, wyniku ani adresu IP. Opcjonalne powiadomienie na `smile@pracowniazycia.pl` zawiera datę i link do arkusza, a nie adres uczestniczki.

## 1. Utwórz prywatny arkusz

1. Zaloguj się na firmowe konto Google, które ma być właścicielem zapisów.
2. Na Dysku Google utwórz nowy Arkusz Google, np. „Pracownia Życia — zapisy z testu”.
3. W oknie **Udostępnij** pozostaw dostęp ogólny **Ograniczony**. Nie publikuj arkusza w internecie. Dostęp nadaj tylko osobom, które rzeczywiście potrzebują tych danych.
4. Z adresu `https://docs.google.com/spreadsheets/d/IDENTYFIKATOR/edit` skopiuj sam `IDENTYFIKATOR`.
5. W arkuszu wybierz **Rozszerzenia → Apps Script**.

## 2. Wklej skrypt i ustaw jego właściwości

1. W pliku `Code.gs` w edytorze Apps Script zastąp przykładowy kod całą zawartością pliku `integrations/google-sheets/Code.gs` z tego projektu. Zapisz projekt, np. jako „Zapisy z testu samooceny”.
2. Otwórz **Ustawienia projektu → Właściwości skryptu → Dodaj właściwość skryptu**.
3. Dodaj:

| Właściwość skryptu | Wartość |
| --- | --- |
| `SPREADSHEET_ID` | Identyfikator arkusza skopiowany w kroku 1 |
| `SHARED_SECRET` | Nowy losowy sekret, najlepiej 64 znaki; minimum 32, maksimum 256 |
| `SHEET_NAME` | Opcjonalnie nazwa zakładki; domyślnie `Zapisy` |
| `NOTIFICATION_EMAIL` | Opcjonalnie `smile@pracowniazycia.pl`; pomiń, jeśli nie chcesz powiadomień |

Wygeneruj sekret w menedżerze haseł i przechowuj go tam. **Nie wklejaj go do rozmowy, kodu, GitHuba ani adresu URL.** Ten sam sekret będzie potrzebny w ustawieniach Vercela. Nie dodawaj spacji na początku ani końcu.

4. W edytorze wybierz funkcję **initializeLeadSheet** i kliknij **Uruchom**. Pozwoli to zatwierdzić uprawnienia Google i utworzyć zakładkę z nagłówkami. Funkcja nie wysyła wiadomości i nie dodaje adresów.
5. Google poprosi o dostęp potrzebny do obsługi arkusza. Skrypt zawiera także opcję wysyłania powiadomień, więc Google może poprosić o uprawnienie do wysyłania e-maili. `MailApp` nie odczytuje skrzynki Gmail. Zatwierdź tylko własny projekt, którego kod właśnie wkleiłaś.

Ustawienia i uprawnienia zależą od zasad Twojego konta Google Workspace. Jeśli administrator blokuje publiczne aplikacje Apps Script, ten wariant nie zadziała bez zmiany zasad; nie udostępniaj w zamian publicznie samego arkusza.

## 3. Opublikuj sam punkt zapisu

1. W Apps Script wybierz **Wdróż → Nowe wdrożenie → Aplikacja internetowa**.
2. W polu **Wykonuj jako** wybierz **Ja** — konto będące właścicielem arkusza.
3. W polu dostępu wybierz **Każdy** (również użytkownicy niezalogowani). Jest to wymagane dla połączenia serwer–serwer z Vercela. **Arkusz pozostaje prywatny**; publiczny jest tylko punkt zapisu, zabezpieczony sekretem.
4. Kliknij **Wdróż** i skopiuj adres aplikacji kończący się na **`/exec`**, np. `https://script.google.com/macros/s/IDENTYFIKATOR_WDROŻENIA/exec`.

Nie używaj adresu `/dev` — służy on wyłącznie do testów przez edytorów projektu. Otwarcie adresu `/exec` w przeglądarce zwróci `{"ok":false,"error":"method_not_allowed"}`. To prawidłowe: zwykłe otwarcie strony nie pokazuje danych ani nie dodaje zapisu.

Po każdej późniejszej zmianie `Code.gs` wybierz **Wdróż → Zarządzaj wdrożeniami → Edytuj → Nowa wersja → Wdróż**. Samo zapisanie kodu nie aktualizuje opublikowanej wersji.

## 4. Połącz Vercel z Google

W projekcie **pz-test-samooceny** na Vercelu otwórz **Settings → Environment Variables** i dodaj tylko po stronie serwera:

| Zmienna Vercela | Wartość |
| --- | --- |
| `GOOGLE_SHEETS_WEB_APP_URL` | Adres aplikacji Apps Script zakończony `/exec` |
| `GOOGLE_SHEETS_SHARED_SECRET` | Dokładnie ten sam sekret co `SHARED_SECRET` |

Zaznacz środowisko **Production**. Nie dodawaj prefiksu `NEXT_PUBLIC_`: sekret nie może trafiać do przeglądarki uczestniczki. Dla Preview lub Development użyj osobnego testowego arkusza i osobnego wdrożenia; nie podłączaj ich przypadkowo do prawdziwej listy kontaktów.

Po skonfigurowaniu Google i zapisaniu zmiennych trzeba również **opublikować przygotowane zmiany projektu w repozytorium GitHub połączonym z Vercelem**. Vercel uruchomi wtedy nowe wdrożenie. Same zmienne i ponowne wdrożenie starego kodu nie dodadzą tej integracji. Jeśli właściwa wersja kodu jest już opublikowana, a zmieniasz tylko konfigurację, użyj **Redeploy** — działające wcześniej wdrożenie nie odczyta nowej konfiguracji samo. Sekret nie powinien być wysyłany przez uczestniczkę ani widoczny w kodzie strony; z Apps Script łączy się wyłącznie serwer `/api/leads`.

## 5. Sprawdź działanie przed udostępnieniem

Użyj adresu e-mail, do którego masz prawo, i sprawdź:

1. Ukończenie testu, podanie e-maila i zgody pokazuje wynik **dopiero po potwierdzeniu zapisu**.
2. W zakładce `Zapisy` pojawia się jeden wiersz z e-mailem, datą UTC, zgodą `TAK`, wersją i pełną treścią zgody, wersją testu oraz identyfikatorem zgłoszenia.
3. W arkuszu **nie ma odpowiedzi, punktów, kategorii wyniku, adresu IP ani klucza dostępowego**.
4. Powtórzenie zapisu tego samego e-maila z tą samą wersją zgody nie tworzy kolejnego wiersza i nadal pozwala zobaczyć wynik. To lista kontaktów, a nie licznik wszystkich wykonanych testów.
5. Jeśli włączyłaś `NOTIFICATION_EMAIL`, na Twoją skrzynkę przychodzi powiadomienie z datą i odnośnikiem do prywatnego arkusza. Nie zawiera adresu uczestniczki ani jej wyniku. Nie wysyłamy wiadomości do uczestniczki.
6. W **testowym** wdrożeniu błędny sekret lub niedostępny arkusz powoduje czytelny błąd zapisu, nie fałszywe potwierdzenie. Można spróbować ponownie bez utraty wypełnionych odpowiedzi.
7. Osoba niezalogowana nie może otworzyć samego arkusza ani odczytać danych przez `/exec`.

Usuń swoje próbne wiersze po sprawdzeniu integracji. Nie testuj na cudzych adresach. Testy automatyczne w `Code.test.mjs` używają wyłącznie atrap usług Google: nie zapisują nic na Dysku i nie wysyłają wiadomości. Można je uruchomić przez `node --test integrations/google-sheets/Code.test.mjs`.

## Ograniczenia i bezpieczeństwo

- Deduplikacja znajduje wcześniejszy zapis w trwałym arkuszu. `LockService` zapobiega dopisywaniu dwóch wierszy jednocześnie przez ten skrypt. Nie edytuj nagłówków ani identyfikatorów i nie używaj równolegle drugiego wdrożenia z innym projektem Apps Script do zapisu w tej samej zakładce.
- Globalny ogranicznik dopuszcza domyślnie 120 nowych, poprawnych zapisów w godzinie UTC. Wykorzystuje `CacheService`, którego wpis może zniknąć wcześniej. To ograniczenie pomocnicze, **nie pełna ochrona przed botami ani atakami**. Przed większym ruchem skonfiguruj również ograniczanie żądań do `/api/leads` w Vercel WAF; w razie potrzeby dodaj CAPTCHA. Sekret chroni punkt Google przed nieautoryzowanym zapisem, ale formularz testu jest publiczny.
- Google Apps Script ma limity wykonania i usług. Po ich przekroczeniu zapis może być niedostępny. To rozwiązanie tymczasowe dla niewielkiej listy, nie zamiennik systemu mailingowego przy dużym ruchu.
- Powiadomienia e-mail podlegają oddzielnym limitom Google. Brak limitu wysyłki lub błąd powiadomienia **nie usuwa zapisu i nie blokuje wyniku**, jeżeli adres został już zapisany. Nie ma kolejki ponawiania tych powiadomień: sprawdzaj sam arkusz, nawet jeśli nie dotarł e-mail.
- Wartości są zapisywane jako literalny tekst. Nietypowy adres zaczynający się od `=`, `+`, `-` lub apostrofu otrzymuje dodatkowy literalny apostrof na początku, żeby nie stał się formułą również w CSV. Zwykłe adresy pozostają bez zmian. **Przed importem kontaktów do MailerLite usuń dokładnie jeden taki dodany apostrof z tych nietypowych adresów**, nie z pozostałych. Nie usuwaj zabezpieczenia przed otwarciem CSV w programie arkuszowym. Wyeksportowane dane nadal traktuj jak dane z publicznego formularza; nie uruchamiaj formuł ani makr. Po migracji wyeksportuj tylko potrzebne pola.
- Ten zapis nie potwierdza, że uczestniczka jest właścicielką podanego adresu (nie jest to double opt-in). Techniczny zapis checkboxa sam w sobie nie przesądza o ważności zgody. Dopasuj informację o przetwarzaniu danych i okres przechowywania do rzeczywistego procesu; arkusz jest miejscem przechowywania danych osobowych.
- Dostęp do projektu Apps Script oznacza dostęp do sekretu i arkusza. Nie udostępniaj edycji projektu osobom postronnym. Przy podejrzeniu ujawnienia zmień sekret w Script Properties **i** w Vercelu, a następnie wykonaj Redeploy.
- Po uruchomieniu MailerLite przetestuj nową ścieżkę zapisu, wyłącz stare wdrożenie Apps Script i usuń niepotrzebne kopie zgodnie z przyjętym okresem przechowywania danych.

## Dla osoby technicznej

`POST` do Apps Script przyjmuje dokładnie:

```json
{
  "secret": "<sekret-serwera>",
  "submissionId": "<UUID>",
  "email": "adres@example.com",
  "marketingConsent": true,
  "consentVersion": "marketing-email-v1-2026-09-15",
  "testVersion": "self-esteem-v1",
  "submittedAt": "2026-09-17T12:00:00.000Z"
}
```

Wymagany `Content-Type: application/json`; limit treści 4096 bajtów. E-mail musi być znormalizowany do małych liter, bez otaczających spacji, w obsługiwanym formacie ASCII. UUID i data ISO UTC są ponownie walidowane. Odpowiedź `{"ok":true}` oznacza zapis potwierdzony odczytem identyfikatora po `SpreadsheetApp.flush()` albo odnaleziony wcześniejszy zapis. Błędy zwracają `{"ok":false,"error":"kod"}` bez danych osobowych. Apps Script `TextOutput` nie oferuje tu własnych statusów błędu HTTP, więc serwer musi sprawdzać `body.ok`, a nie sam status HTTP. Biblioteka HTTP musi obsługiwać przekierowanie odpowiedzi ContentService do domeny `script.googleusercontent.com`.

## Dokumentacja źródłowa

Opis konfiguracji opiera się na oficjalnej dokumentacji: [wdrożenia Apps Script](https://developers.google.com/apps-script/guides/web), [właściwości skryptu](https://developers.google.com/apps-script/guides/properties), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [CacheService](https://developers.google.com/apps-script/reference/cache/cache-service), [literalny zapis tekstu przez setRichTextValues](https://developers.google.com/apps-script/reference/spreadsheet/range), [tworzenie wartości tekstowych przez newRichTextValue](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#newRichTextValue()), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [limity Google](https://developers.google.com/apps-script/guides/services/quotas) i [ContentService](https://developers.google.com/apps-script/reference/content/content-service).
